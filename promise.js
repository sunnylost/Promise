/**
 * Promises/A+
 * https://promisesaplus.com/
 */
(function ( root, factory ) {
        if ( typeof define === 'function' && define.amd ) {
            // AMD
            define( [ 'Promise' ], factory )
        } else if ( typeof exports === 'object' ) {
            // Node, CommonJS-like
            module.exports = factory()
        } else {
            // Browser globals (root is window)
            root.Promise = factory()
        }
    }( this, function () {
        var FULLFILLED  = 'fullfilled',
            REJECTED    = 'rejected',
            PENDING     = 'pending',
            UNDEFINED   = void 0,
            gid         = 0,
            promises    = [],

            asyncRunner = function () {
                if ( typeof process != 'undefined' && process.nextTick ) {
                    return function ( handler ) {
                        process.nextTick( handler )
                    }
                } else if ( typeof setImmediate != 'undefined' ) {
                    return function ( handler ) {
                        setImmediate( handler )
                    }
                } else {
                    return function ( handler ) {
                        setTimeout( handler, 0 )
                    }
                }
            }()

        function isFunction( fn ) {
            return typeof fn === 'function'
        }

        function isObject( obj ) {
            return typeof obj === 'object'
        }

        /**
         * resolve 函数的默认值
         */
        function Identity( x ) {
            return x
        }

        /**
         * reject 函数的默认值
         */
        function Thrower( e ) {
            return e
        }

        function isPromise( promise ) {
            return ( isObject( promise ) || isFunction( promise ) ) && 'state' in promise
        }

        function promiseResolution( promise, reactions ) {
            asyncRunner( function () {
                var anotherReactions = promise.state === FULLFILLED ? promise.rejectReactions : promise.fullFillReactions
                while ( reactions.length ) {
                    var reaction        = reactions.shift(),
                        anotherReaction = anotherReactions.shift()

                    if ( reaction === promise ) {
                        return promise.reject( new Error( 'Type error!' ) )
                    }

                    var result

                    try {
                        result = reaction( promise.result )
                    } catch ( e ) {
                        result = e
                        promise.reject( e )
                        if ( promise.state === FULLFILLED ) {
                            anotherReactions.push( anotherReaction )
                            reactions = anotherReactions
                        }
                        promise.state = REJECTED
                    } finally {
                        promise.result = result
                    }

                    //2.3.2
                    if ( isPromise( result ) ) {
                        var reactionState  = result.state,
                            reactionResult = result.result,
                            oldPromise     = promise

                        promise.isResolved = false

                        if ( reactionState === PENDING ) {
                            console.log( "TODO pending" )
                            return result.then( function ( result ) {
                                return promise.resolve( result )
                            } ).catch( function ( result ) {
                                return promise.reject( result )
                            } )
                        } else if ( reactionState === FULLFILLED ) {
                            result.then( function ( result ) {
                                return oldPromise.resolve( result )
                            } )
                        } else {
                            result.catch( function ( result ) {
                                return oldPromise.reject( result )
                            } )
                        }
                    } else if ( isObject( result ) || isFunction( result ) ) {
                        //2.3.3
                        try {
                            var then = result.then
                        } catch ( e ) {
                            return promise.reject( e )
                        }
                    } else {
                        promise.resolve( result )
                    }
                }
            } )
        }

        function wrapPromise( promise, onFullfilled, onRejected ) {
            return new Promise( function ( resolve, reject ) {
                var state = promise.state

                if ( state === PENDING ) {
                    promise.fullFillReactions.push( onFullfilled, function ( result ) {
                        resolve( result )
                        return result
                    } )
                    promise.rejectReactions.push( onRejected, function ( result ) {
                        reject( result )
                        return result
                    } )
                } else {
                    var resolver = state === FULLFILLED ? onFullfilled : onRejected
                    try {
                        var x = resolver( promise.result )
                    } catch ( e ) {
                        reject( e )
                    }

                    if ( isPromise( x ) ) {
                        x.then( resolve, reject )
                    } else {
                        state === FULLFILLED ? resolve( x ) : reject( x )
                    }
                }
            } )
        }

        function Promise( executor ) {
            this.state             = PENDING
            this.fullFillReactions = []
            this.rejectReactions   = []
            this.isResolved        = false
            this.gid               = gid++

            this.resolve = function ( x ) {
                if ( this.isResolved ) {
                    return
                }

                var reactions          = this.fullFillReactions
                this.isResolved        = true
                this.state             = FULLFILLED
                this.result            = x
                this.fullFillReactions = UNDEFINED

                reactions && reactions.length && promiseResolution( this, reactions, FULLFILLED )
            }.bind( this )

            this.reject = function ( reason ) {
                if ( this.isResolved ) {
                    return
                }

                var reactions        = this.rejectReactions
                this.isResolved      = true
                this.state           = REJECTED
                this.result          = reason
                this.rejectReactions = UNDEFINED

                reactions && reactions.length && promiseResolution( this, reactions, REJECTED )
            }.bind( this )

            promises.push( this )

            try {
                executor.call( null, this.resolve, this.reject )
            } catch ( e ) {
                this.reject( e )
            }
        }

        Promise.prototype = {
            constructor: Promise,

            then: function ( onFullfilled, onRejected ) {
                var that = this

                !isFunction( onFullfilled ) && ( onFullfilled = Identity )
                !isFunction( onRejected ) && ( onRejected = Thrower )

                return wrapPromise( that, onFullfilled, onRejected )
            },

            catch: function ( onRejected ) {
                return this.then( UNDEFINED, onRejected )
            }
        }

        Promise.resolve = function ( x ) {
            return new Promise( function ( resolve ) {
                resolve( x )
            } )
        }

        Promise.reject = function ( reason ) {
            return new Promise( function ( _, reject ) {
                reject( reason )
            } )
        }

        Promise.all = function ( iterable ) {

        }

        Promise.race = function ( iterable ) {

        }

        return Promise
    } )
)
