/**
 * Promise Object
 * http://people.mozilla.org/~jorendorff/es6-draft.html#sec-promise-objects
 */
(function() {
	var UNRESOLVED = 'unresolved',
		HAS_RESOLUTION = 'has-resolution',
		HAS_REJECTION  = 'has-rejection';

	function isFunction(fn) {
		return typeof fn === 'function';
	}

	/**
	 * resolve 函数的默认值
	 */
	function identity(x) {
		return x;
	}

	/**
	 * reject 函数的默认值
	 */
	function thrower(e) {
		throw new Error(e);
	}

	function IsPromise(promise) {
		return promise instanceof Promise;
	}

	function resolveFn(reason) {
		var status = this.status;
		if(status !== UNRESOLVED) return undefined;

		var reactions = this.resolveReactions;
		this.resolveReactions = undefined;
		this.status = HAS_RESOLUTION;
		this.__PromiseResult__ = reason;

		TriggerPromiseReactions.call(this, reactions, reason);
	}

	function rejectFn(reason) {
		var status = this.status;
		if(status !== UNRESOLVED) return undefined;

		var reactions = this.rejectReactions;
		this.rejectReactions = undefined;
		this.status = HAS_REJECTION;
		this.__PromiseResult__ = reason;

		TriggerPromiseReactions.call(this, reactions, reason);
	}

	function TriggerPromiseReactions(reactions, reason) {
		var len = reactions.length,
			reaction,
			result;

		while(len--) {
			reaction = reactions.shift();
			result = reaction.call(null, reason);
			if(typeof result != 'undefined') {
				if(IsPromise(result)) {
					result.resolveReactions = this.resolveReactions || reactions;
					result.rejectReactions  = this.rejectReactions  || reactions;
					return result;
				}
				this.__PromiseResult__ = reason = result;
			}
		}
	}

	function Promise(executor) {
		if(!isFunction(executor)) throw new TypeError('Promise constructor takes a function argument.');
		this.status = UNRESOLVED;
		this.resolveReactions = [];
		this.rejectReactions  = [];

		this.resolve = resolveFn.bind(this);
		this.reject  = rejectFn.bind(this);

		executor.call(null, this.resolve, this.reject);
	}

	Promise.prototype = {
		constructor: Promise,

		/**
		 * http://people.mozilla.org/~jorendorff/es6-draft.html#sec-promise.prototype.catch
		 */
		catch: function(onRejected) {
			return this.then(undefined, onRejected);
		},

		then: function(onFulfilled, onRejected) {
			var status = this.status,
				reason = this.__PromiseResult__;
			isFunction(onFulfilled) || (onFulfilled = identity);
			isFunction(onRejected)  || (onRejected  = thrower);

			if(status === UNRESOLVED) {
				this.resolveReactions.push(onFulfilled);
				this.rejectReactions.push(onRejected);
			} else if(status === HAS_RESOLUTION) {
				TriggerPromiseReactions.call(this, [onFulfilled], reason);
			} else {
				TriggerPromiseReactions.call(this, [onRejected], reason);
			}
			return this;
		}
	};

	Promise.all = function(arr) {
		return new Promise(function(resolve, reject) {
			var i 	  = 0,
				len   = arr.length,
				count = len;

			for(; i < len; i++) {
				arr[i].call(null).then(function() {
					count--;
					if(!count) {
						resolve();
					}
				}, function(e) {
					reject();
				})
			}
		});
	};

	Promise.race = function(arr) {
		return new Promise(function(resolve, reject) {
			var i 	  = 0,
				len   = arr.length;

			for(; i < len; i++) {
				arr[i].call(null).then(function() {
					resolve();
				}, function(e) {
					reject();
				})
			}
		});
	};

	window.myPromise = Promise;
	window.Deferred  = function() {
		return new Promise(function() {});
	};
}())