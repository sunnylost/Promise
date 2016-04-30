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

            asyncWorker = function () {
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
            return promise instanceof Promise
        }

        function resolveFn( reason ) {
            var state = this.__PromiseState__
            if ( state !== PENDING ) return UNDEFINED

            var reactions                    = this.__PromiseFulfillReactions__
            this.__PromiseFulfillReactions__ = UNDEFINED
            this.__PromiseState__            = FULLFILLED
            this.__PromiseResult__           = reason

            asyncWorker( TriggerPromiseReactions.bind( this ), reactions )
        }

        function rejectFn( reason ) {
            var state = this.__PromiseState__
            if ( state !== PENDING ) return UNDEFINED

            var reactions                   = this.__PromiseRejectReactions__
            this.__PromiseRejectReactions__ = UNDEFINED
            this.__PromiseState__           = REJECTED
            this.__PromiseResult__          = reason

            asyncWorker( TriggerPromiseReactions.bind( this ), reactions )
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
                result   = reaction.call( null, this.__PromiseResult__ )

                if ( IsPromise( result ) ) {
                    resolveReactions = this.__PromiseFulfillReactions__ || reactions || []
                    rejectReactions  = this.__PromiseRejectReactions__ || reactions || []
                    max              = Math.max( resolveReactions.length, rejectReactions.length )
                    for ( i = 0; i < max; i++ ) {
                        result = result.then( resolveReactions[ i ], rejectReactions[ i ] )
                    }
                    console.log( result )
                    return result
                }
                this.__PromiseResult__ = reason = result
            }
        }

        function Promise( executor ) {
            if ( !isFunction( executor ) ) throw new TypeError( 'Promise constructor takes a function argument.' )
            if ( !( this instanceof Promise ) ) throw new TypeError( 'Promise cannot be called as a function.' )

            //https://tc39.github.io/ecma262/#sec-properties-of-promise-instances
            this.__PromiseState__            = PENDING
            this.__PromiseIsHandled__        = false
            this.__PromiseResult__           = UNDEFINED
            this.__PromiseFulfillReactions__ = []
            this.__PromiseRejectReactions__  = []

            this.resolve = resolveFn.bind( this )
            this.reject  = rejectFn.bind( this )

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
                var state = this.__PromiseState__

                if ( !IsPromise( this ) ) {
                    throw new TypeError( 'this is not a Promise Object.' )
                }

                isFunction( onFulfilled ) || ( onFulfilled = Identity )
                isFunction( onRejected ) || ( onRejected = Thrower )

                if ( state === PENDING ) {
                    this.__PromiseFulfillReactions__.push( onFulfilled )
                    this.__PromiseRejectReactions__.push( onRejected )
                } else if ( state === FULLFILLED ) {
                    asyncWorker( TriggerPromiseReactions.bind( this ), [ onFulfilled ] )
                } else {
                    asyncWorker( TriggerPromiseReactions.bind( this ), [ onRejected ] )
                }
                return this
            }
        }

        Promise.resolve = function () {
            var args = [].splice.call( arguments, 0 )
            return new Promise( function ( resolve ) {
                resolve.apply( null, args )
            } )
        }

        Promise.reject = function () {
            var args = [].splice.call( arguments, 0 )
            return new Promise( function ( _, reject ) {
                reject.apply( null, args )
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
