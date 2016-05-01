/**
 * Promise Object
 * https://tc39.github.io/ecma262/#sec-promise-objects
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
    var FULFILLED   = 'fulfilled',
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

    function IsFunction( fn ) {
        return typeof fn === 'function'
    }

    function IsObject( obj ) {
        return obj !== null && typeof obj === 'object' || IsFunction( obj )
    }

    function IsConstructor( argument ) {
        if ( !IsObject( argument ) ) {
            return false
        }

        if ( argument.constructor ) {
            return true
        }

        return false
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
        throw e
    }

    //https://tc39.github.io/ecma262/#sec-ispromise
    function IsPromise( x ) {
        return IsObject( x ) && x.hasOwnProperty( '__PromiseState__' )
    }

    //https://tc39.github.io/ecma262/#sec-enqueuejob
    //TODO: This is a fake implementation
    function EnqueueJob( queueName, job, args ) {
        asyncRunner( function () {
            job.apply( UNDEFINED, args )
        } )
    }

    //https://tc39.github.io/ecma262/#sec-createresolvingfunctions
    function CreateResolvingFunctions( promise ) {
        //https://tc39.github.io/ecma262/#sec-promise-resolve-functions
        var resolve = function ( resolution ) {
                var promise = resolve.__Promise__

                if ( resolve.__AlreadyResolved__ ) {
                    return UNDEFINED
                }

                resolve.__AlreadyResolved__ = true

                if ( resolution === promise ) {
                    return RejectPromise( promise, new TypeError( 'resolution cannot be promise itself' ) )
                }

                if ( !IsObject( resolution ) ) {
                    return FulfillPromise( promise, resolution )
                }

                var thenAction

                try {
                    thenAction = resolution.then

                    if ( !IsFunction( thenAction ) ) {
                        return FulfillPromise( promise, resolution )
                    }

                    return EnqueueJob( 'PromiseJobs', PromiseResolveThenableJob, [ promise, resolution, thenAction ] )
                } catch ( e ) {
                    return RejectPromise( promise, e )
                }
            },

            //https://tc39.github.io/ecma262/#sec-promise-reject-functions
            reject  = function ( reason ) {
                if ( reject.__AlreadyResolved__ ) {
                    return UNDEFINED
                }

                reject.__AlreadyResolved__ = true
                return RejectPromise( reject.__Promise__, reason )
            }

        resolve.__Promise__ = reject.__Promise__ = promise
        resolve.__AlreadyResolved__ = reject.__AlreadyResolved__ = false

        promise.resolve = resolve
        promise.reject  = reject

        return {
            __Resolve__: resolve,
            __Reject__ : reject
        }
    }

    //https://tc39.github.io/ecma262/#sec-newpromisecapability
    function NewPromiseCapability( C ) {
        if ( !IsConstructor( C ) ) {
            throw new TypeError( C + ' is not a constructor' )
        }

        var promiseCapability = {
                __Promise__: UNDEFINED,
                __Resolve__: UNDEFINED,
                __Reject__ : UNDEFINED
            },
            //https://tc39.github.io/ecma262/#sec-getcapabilitiesexecutor-functions
            executor          = function ( resolve, reject ) {
                var promiseCapability = executor.__Capability__

                if ( IsFunction( promiseCapability.__Resolve__ ) ) {
                    throw new TypeError( '__Resolve__ is not undefined' )
                }

                if ( IsFunction( promiseCapability.__Reject__ ) ) {
                    throw new TypeError( '__Reject__ is not undefined' )
                }

                promiseCapability.__Resolve__ = resolve
                promiseCapability.__Reject__  = reject
            },
            promise

        executor.__Capability__ = promiseCapability

        promise = new C( executor )

        if ( !IsFunction( promiseCapability.__Resolve__ ) ) {
            throw new TypeError( '__Resolve__ is not a function' )
        }

        if ( !IsFunction( promiseCapability.__Reject__ ) ) {
            throw new TypeError( '__Reject__ is not a function' )
        }

        promiseCapability.__Promise__ = promise
        return promiseCapability
    }

    //https://tc39.github.io/ecma262/#sec-fulfillpromise
    function FulfillPromise( promise, value ) {
        if ( promise.__PromiseState__ === PENDING ) {
            var reactions                       = promise.__PromiseFulfillReactions__
            promise.__PromiseResult__           = value
            promise.__PromiseFulfillReactions__ = promise.__PromiseRejectReactions__ = UNDEFINED
            promise.__PromiseState__ = FULFILLED

            TriggerPromiseReactions( reactions, value )
        }
    }

    //https://tc39.github.io/ecma262/#sec-rejectpromise
    function RejectPromise( promise, reason ) {
        if ( promise.__PromiseState__ === PENDING ) {
            var reactions                       = promise.__PromiseRejectReactions__
            promise.__PromiseResult__           = reason
            promise.__PromiseFulfillReactions__ = promise.__PromiseRejectReactions__ = UNDEFINED
            promise.__PromiseState__ = REJECTED

            TriggerPromiseReactions( reactions, reason )
        }
    }

    //https://tc39.github.io/ecma262/#sec-triggerpromisereactions
    function TriggerPromiseReactions( reactions, argument ) {
        reactions.forEach( function ( reaction ) {
            EnqueueJob( 'PromiseJobs', PromiseReactionJob, [ reaction, argument ] )
        } )
    }

    //https://tc39.github.io/ecma262/#sec-host-promise-rejection-tracker
    function HostPromiseRejectionTracker( promise, operation ) {
        //TODO
    }

    //https://tc39.github.io/ecma262/#sec-promise-jobs

    //https://tc39.github.io/ecma262/#sec-promisereactionjob
    function PromiseReactionJob( reaction, argument ) {
        var promiseCapability = reaction.__Capabilities__,
            handler           = reaction.__Handler__,
            handlerResult

        try {
            handlerResult = handler( argument )
        } catch ( e ) {
            return promiseCapability.__Reject__( e )
        }

        promiseCapability.__Resolve__( handlerResult )
    }

    //https://tc39.github.io/ecma262/#sec-promiseresolvethenablejob
    function PromiseResolveThenableJob( promiseToResolve, thenable, then ) {
        var resolvingFunctions = CreateResolvingFunctions( promiseToResolve ),
            thenCallResult

        try {
            thenCallResult = then.call( thenable, resolvingFunctions.__Resolve__, resolvingFunctions.__Reject__ )
        } catch ( e ) {
            return resolvingFunctions.__Reject__( e )
        }
        return thenCallResult
    }

    //https://tc39.github.io/ecma262/#sec-performpromisethen
    function PerformPromiseThen( promise, onFulfilled, onRejected, resultCapability ) {
        IsFunction( onFulfilled ) || ( onFulfilled = Identity )
        IsFunction( onRejected ) || ( onRejected = Thrower )

        var fulfillReaction = {
                __Capabilities__: resultCapability,
                __Handler__     : onFulfilled
            },

            rejectReaction  = {
                __Capabilities__: resultCapability,
                __Handler__     : onRejected
            }

        if ( promise.__PromiseState__ === PENDING ) {
            promise.__PromiseFulfillReactions__.push( fulfillReaction )
            promise.__PromiseRejectReactions__.push( rejectReaction )
        } else if ( promise.__PromiseState__ === FULFILLED ) {
            var result = promise.__PromiseResult__
            EnqueueJob( 'PromiseJobs', PromiseReactionJob, [ fulfillReaction, result ] )
        } else {
            var reason = promise.__PromiseResult__

            if ( !promise.__PromiseIsHandled__ ) {
                HostPromiseRejectionTracker( promise, 'handle' )
            }
            EnqueueJob( 'PromiseJobs', PromiseReactionJob, [ rejectReaction, reason ] )
        }

        promise.__PromiseIsHandled__ = true

        return resultCapability.__Promise__
    }

    //https://tc39.github.io/ecma262/#sec-performpromiseall
    function PerformPromiseAll( iterable, constructor, resultCapability ) {
        var values                 = [],
            remainingElementsCount = {
                __Values__: 1
            },
            index                  = 0,
            len                    = iterable.length,
            nextValue, nextPromise, resolveElement

        for ( ; index < len; index++ ) {
            nextValue = iterable[ index ]
            values.push( UNDEFINED )
            nextPromise = constructor.resolve( nextValue )

            //https://tc39.github.io/ecma262/#sec-promise.all-resolve-element-functions
            resolveElement = function ( x ) {
                var alreadyCalled          = resolveElement.__AlreadyCalled__,
                    index                  = resolveElement.__Index__,
                    values                 = resolveElement.__Values__,
                    promiseCapability      = resolveElement.__Capabilities__,
                    remainingElementsCount = resolveElement.__RemainingElements__

                if ( alreadyCalled ) {
                    return
                }

                resolveElement.__AlreadyCalled__ = true

                values[ index ] = x
                remainingElementsCount.__Values__ -= 1
                if ( remainingElementsCount.__Values__ == 0 ) {
                    promiseCapability.__Resolve__( values )
                }
            }

            resolveElement.__AlreadyCalled__     = false
            resolveElement.__Index__             = index
            resolveElement.__Values__            = values
            resolveElement.__Capabilities__      = resultCapability
            resolveElement.__RemainingElements__ = remainingElementsCount

            remainingElementsCount.__Value__ += 1

            nextPromise.then( resolveElement, resultCapability.__Reject__ )
        }

        remainingElementsCount.__Value__ -= 1
        if ( remainingElementsCount.__Values__ === 0 ) {
            resultCapability.__Resolve__( values )
        }

        return resultCapability.__Promise__
    }

    //https://tc39.github.io/ecma262/#sec-performpromiserace
    function PerformPromiseRace( iterable, promiseCapability, C ) {
        var index = 0,
            len   = iterable.length,
            next, nextPromise

        for ( ; index < len; index++ ) {
            next        = iterable[ index ]
            nextPromise = C.resolve( next )
            nextPromise.then( promiseCapability.__Resolve__, promiseCapability.__Reject__ )
        }

        return promiseCapability.__Promise__
    }

    //https://tc39.github.io/ecma262/#sec-promise-constructor
    function Promise( executor ) {
        if ( !IsFunction( executor ) ) throw new TypeError( 'Promise constructor takes a function argument.' )
        if ( !( this instanceof Promise ) ) throw new TypeError( 'Promise cannot be called as a function.' )

        this.__PromiseState__            = PENDING
        this.__PromiseIsHandled__        = false
        this.__PromiseFulfillReactions__ = []
        this.__PromiseRejectReactions__  = []

        var resolvingFunctions = CreateResolvingFunctions( this )

        try {
            executor.call( UNDEFINED, resolvingFunctions.__Resolve__, resolvingFunctions.__Reject__ )
        } catch ( e ) {
            resolvingFunctions.__Reject__( e )
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

        //https://tc39.github.io/ecma262/#sec-promise.prototype.then
        then: function ( onFulfilled, onRejected ) {
            if ( !IsPromise( this ) ) {
                throw new TypeError( '`this` is not a Promise Object.' )
            }

            var promise          = this,
                C                = promise.constructor,
                resultCapability = NewPromiseCapability( C )

            return PerformPromiseThen( promise, onFulfilled, onRejected, resultCapability )
        }
    }

    //https://tc39.github.io/ecma262/#sec-promise.resolve
    Promise.resolve = Promise.resolved = function ( x ) {
        var C = Promise

        if ( IsPromise( x ) ) {
            var xConstructor = x.constructor

            if ( C === xConstructor ) {
                return x
            }
        }

        var promiseCapability = NewPromiseCapability( C )
        promiseCapability.__Resolve__( x )

        return promiseCapability.__Promise__
    }

    //https://tc39.github.io/ecma262/#sec-promise.reject
    Promise.reject = Promise.rejected = function ( r ) {
        var C = Promise

        if ( !IsObject( C ) ) {
            throw new TypeError( '`this` must be an object' )
        }

        var promiseCapability = NewPromiseCapability( C )
        promiseCapability.__Reject__( r )

        return promiseCapability.__Promise__
    }

    //https://tc39.github.io/ecma262/#sec-promise.all
    //FIXME: assume iterable is an array
    Promise.all = function ( iterable ) {
        var C = this

        if ( !IsObject( C ) ) {
            throw new TypeError( '`this` must be an object' )
        }

        if ( !iterable ) {
            return
        }

        var promiseCapability = NewPromiseCapability( C ),
            result

        try {
            result = PerformPromiseAll( iterable, C, promiseCapability )
        } catch ( e ) {
            promiseCapability.__Reject__( e )
            return promiseCapability.__Promise__
        }

        return result
    }

    Promise.race = function ( iterable ) {
        var C = this

        if ( !IsObject( C ) ) {
            throw new TypeError( '`this` must be an object' )
        }

        if ( !iterable ) {
            return
        }

        var promiseCapability = NewPromiseCapability( C ),
            result

        try {
            result = PerformPromiseRace( iterable, promiseCapability, C )
        } catch ( e ) {
            promiseCapability.__Reject__( e )
            return promiseCapability.__Promise__
        }

        return result
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
} ))
