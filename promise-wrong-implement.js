/**
 * Promise Object
 * http://people.mozilla.org/~jorendorff/es6-draft.html#sec-promise-objects
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
            return typeof obj === 'object' || isFunction( obj )
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
            throw new Error( e )
        }

        function IsPromise( promise ) {
            return isObject( promise ) && 'state' in promise
        }

        function CreateResolvingFunctions( promise ) {
            var resolve = function ( resolution ) {
                    if ( resolve.alreadyResolved ) {
                        return
                    }

                    resolve.alreadyResolved = true

                    if ( resolution === promise ) {
                        return RejectPromise( promise, new TypeError( 'resolution cannot be promise itself' ) )
                    }

                    if ( !isObject( resolution ) ) {
                        return FullfillPromise( promise, resolution )
                    }

                    try {
                        var then = resolution.then

                        if ( !isFunction( then ) ) {
                            return FullfillPromise( promise, resolution )
                        } else {
                            console.log( 'hahaha' )
                            return PromiseResolveThenableJob( promise, resolution, then )
                        }
                    } catch ( e ) {
                        return RejectPromise( promise, then )
                    }
                },

                reject  = function ( reason ) {
                    if ( reject.alreadyResolved ) {
                        return
                    }

                    reject.alreadyResolved = true
                    return RejectPromise( promise, reason )
                }

            resolve.promise = reject.promise = promise
            resolve.alreadyResolved = reject.alreadyResolved = false

            promise.resolve = resolve
            promise.reject  = reject
        }

        function FullfillPromise( promise, resolution ) {
            if ( promise.isResolved ) {
                return
            }

            var reactions             = promise.fullFillReactions
            promise.fullFillReactions = promise.rejectReactions = UNDEFINED
            promise.state      = FULLFILLED
            promise.isResolved = true
            promise.result     = resolution

            TriggerPromiseReactions( reactions, resolution )
        }

        function RejectPromise( promise, reason ) {
            if ( promise.isResolved ) {
                return
            }

            var reactions             = promise.rejectReactions
            promise.fullFillReactions = promise.rejectReactions = UNDEFINED
            promise.state      = REJECTED
            promise.isResolved = true
            promise.result     = reason

            TriggerPromiseReactions( reactions, reason )
        }

        function PromiseReactionJob( reaction, argument ) {
            var promise = reaction.promise,
                handler = reaction.handler,
                result
            try {
                result = handler( argument )
            } catch ( e ) {
                promise.result = e
                return promise.reject( e )
            }

            promise.result = result
            promise.resolve( result )
        }

        function PromiseResolveThenableJob( promiseToResolve, thenable, then ) {
            console.log( 'TODO' )
            var thenCallResult
            CreateResolvingFunctions( promiseToResolve )

            try {
                thenCallResult = thenable.then( promiseToResolve.resolve, promiseToResolve.reject )
            } catch ( e ) {
                return promiseToResolve.reject( e )
            }
            console.log( thenCallResult )
            return thenCallResult
        }

        function TriggerPromiseReactions( reactions, argument ) {
            asyncRunner( function () {
                reactions.forEach( function ( reaction ) {
                    console.log( '1213231' )
                    var result = PromiseReactionJob( reaction, argument )
                    console.log( 172, result )
                } )
            } )
        }

        function Promise( executor ) {
            if ( !isFunction( executor ) ) throw new TypeError( 'Promise constructor takes a function argument.' )
            if ( !( this instanceof Promise ) ) throw new TypeError( 'Promise cannot be called as a function.' )

            this.state             = PENDING
            this.isResolved        = false
            this.isHandled         = false
            this.result            = UNDEFINED
            this.fullFillReactions = []
            this.rejectReactions   = []

            CreateResolvingFunctions( this )

            try {
                executor.call( null, this.resolve, this.reject )
            } catch ( e ) {
                this.reject( e )
            }
        }

        Promise.prototype = {
            constructor: Promise,

            /**
             * http://people.mozilla.org/~jorendorff/es6-draft.html#sec-promise.prototype.catch
             */
            catch: function ( onRejected ) {
                return this.then( UNDEFINED, onRejected )
            },

            then: function ( onFulfilled, onRejected ) {
                var state = this.state,
                    fullfillReaction,
                    rejectReaction

                if ( !IsPromise( this ) ) {
                    throw new TypeError( 'this is not a Promise Object.' )
                }

                isFunction( onFulfilled ) || ( onFulfilled = Identity )
                isFunction( onRejected ) || ( onRejected = Thrower )

                fullfillReaction = {
                    promise: this,
                    handler: onFulfilled
                }

                rejectReaction = {
                    promise: this,
                    handler: onRejected
                }

                if ( state === PENDING ) {
                    this.fullFillReactions.push( fullfillReaction )
                    this.rejectReactions.push( rejectReaction )
                } else if ( state === FULLFILLED ) {
                    PromiseReactionJob( fullfillReaction, this.result )
                } else {
                    if ( !this.isHandled ) {
                        //TODO
                        console.log( 'host promise rejection track' )
                        // HostPromiseRejectionTracker(this, "reject").
                    }
                    PromiseReactionJob( rejectReaction, this.result )
                }

                this.isHandled = true

                return this
            }
        }

        Promise.resolve = function ( x ) {
            var C = this

            if ( IsPromise( x ) ) {
                var xConstructor = x.constructor

                if ( C === xConstructor ) {
                    return x
                }
            }

            return new C( function ( resolve ) {
                resolve( x )
            } )
        }

        Promise.reject = function ( r ) {
            var C = this

            return new C( function ( _, reject ) {
                reject( r )
            } )
        }

        Promise.all = function ( arr ) {
            return new Promise( function ( resolve, reject ) {
                var i     = 0,
                    len   = arr.length,
                    count = len

                for ( ; i < len; i++ ) {
                    arr[ i ].call( null ).then( function ( result ) {
                        count--
                        if ( !count ) {
                            resolve( result )
                        }
                    }, reject )
                }
            } )
        }

        Promise.race = function ( arr ) {
            return new Promise( function ( resolve, reject ) {
                var i   = 0,
                    len = arr.length

                for ( ; i < len; i++ ) {
                    arr[ i ].call( null ).then( resolve, reject )
                }
            } )
        }

        Promise.deferred = function () {
            var deferred = {}

            deferred.promise = new Promise( function ( resolve, reject ) {
                deferred.resolve = resolve
                deferred.reject  = reject
            } )

            return deferred
        }

        return Promise
    } )
)
