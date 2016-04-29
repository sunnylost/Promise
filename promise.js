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
        var UNRESOLVED     = 'unresolved',
            HAS_RESOLUTION = 'has-resolution',
            HAS_REJECTION  = 'has-rejection',

            asyncWorker    = function () {
                function fnWrapper( handler ) {
                    return function ( fn ) {
                        var args = [].splice.call( arguments, 0 ).splice( 1 )
                        handler( function () {
                            fn.apply( null, args )
                        } )
                    }
                }

                if ( typeof process != 'undefined' && process.nextTick ) {
                    return fnWrapper( function ( handler ) {
                        process.nextTick( handler )
                    } )
                } else if ( typeof setImmediate != 'undefined' ) {
                    return fnWrapper( function ( handler ) {
                        setImmediate( handler )
                    } )
                } else {
                    return fnWrapper( function ( handler ) {
                        setTimeout( handler, 0 )
                    } )
                }
            }()

        function isFunction( fn ) {
            return typeof fn === 'function'
        }

        /**
         * resolve 函数的默认值
         */
        function identity( x ) {
            return x
        }

        /**
         * reject 函数的默认值
         */
        function thrower( e ) {
            throw new Error( e )
        }

        function IsPromise( promise ) {
            return promise instanceof Promise
        }

        function resolveFn( reason ) {
            var status = this.status
            if ( status !== UNRESOLVED ) return undefined

            var reactions          = this.resolveReactions
            this.resolveReactions  = undefined
            this.status            = HAS_RESOLUTION
            this.__PromiseResult__ = reason

            asyncWorker( TriggerPromiseReactions.bind( this ), reactions, reason )
        }

        function rejectFn( reason ) {
            var status = this.status
            if ( status !== UNRESOLVED ) return undefined

            var reactions          = this.rejectReactions
            this.rejectReactions   = undefined
            this.status            = HAS_REJECTION
            this.__PromiseResult__ = reason

            asyncWorker( TriggerPromiseReactions.bind( this ), reactions, reason )
        }

        function TriggerPromiseReactions( reactions, reason ) {
            var len = reactions.length,
                reaction,
                result,
                resolveReactions,
                rejectReactions,
                i,
                max

            while ( len-- ) {
                reaction = reactions.shift()
                result   = reaction.call( null, reason )
                if ( typeof result != 'undefined' ) {
                    if ( IsPromise( result ) ) {
                        resolveReactions = this.resolveReactions || reactions || []
                        rejectReactions  = this.rejectReactions || reactions || []
                        max              = Math.max( resolveReactions.length, rejectReactions.length )
                        for ( i = 0; i < max; i++ ) {
                            result.then( resolveReactions[ i ], rejectReactions[ i ] )
                        }
                        return result
                    }
                    this.__PromiseResult__ = reason = result
                }
            }
        }

        function Promise( executor ) {
            if ( !isFunction( executor ) ) throw new TypeError( 'Promise constructor takes a function argument.' )
            this.status           = UNRESOLVED
            this.resolveReactions = []
            this.rejectReactions  = []

            this.resolve = resolveFn.bind( this )
            this.reject  = rejectFn.bind( this )

            executor.call( null, this.resolve, this.reject )
        }

        Promise.prototype = {
            constructor: Promise,

            /**
             * http://people.mozilla.org/~jorendorff/es6-draft.html#sec-promise.prototype.catch
             */
            catch: function ( onRejected ) {
                return this.then( undefined, onRejected )
            },

            then: function ( onFulfilled, onRejected ) {
                var status = this.status,
                    reason = this.__PromiseResult__

                isFunction( onFulfilled ) || ( onFulfilled = identity )
                isFunction( onRejected ) || ( onRejected = thrower )

                if ( status === UNRESOLVED ) {
                    this.resolveReactions.push( onFulfilled )
                    this.rejectReactions.push( onRejected )
                } else if ( status === HAS_RESOLUTION ) {
                    asyncWorker( TriggerPromiseReactions.bind( this ), [ onFulfilled ], reason )
                } else {
                    asyncWorker( TriggerPromiseReactions.bind( this ), [ onRejected ], reason )
                }
                return this
            }
        }

        Promise.all = function ( arr ) {
            return new Promise( function ( resolve, reject ) {
                var i     = 0,
                    len   = arr.length,
                    count = len

                for ( ; i < len; i++ ) {
                    arr[ i ].call( null ).then( function () {
                        count--
                        if ( !count ) {
                            resolve()
                        }
                    }, function ( e ) {
                        reject()
                    } )
                }
            } )
        }

        Promise.race = function ( arr ) {
            return new Promise( function ( resolve, reject ) {
                var i   = 0,
                    len = arr.length

                for ( ; i < len; i++ ) {
                    arr[ i ].call( null ).then( function () {
                        resolve()

                    }, function () {
                        reject()
                    } )
                }
            } )
        }

        return Promise
    } )
)
