import EventbusProxy    from './EventbusProxy.js';
import EventbusSecure   from './EventbusSecure.js';

import * as Utils       from './utils.js';

import { type }         from './typedef.js';  // eslint-disable-line no-unused-vars

/**
 * `@typhonjs-plugin/eventbus` / Provides the ability to bind and trigger custom named events.
 *
 * This module is an evolution of Backbone Events. (http://backbonejs.org/#Events). Eventbus extends the
 * functionality provided in Backbone Events with additional triggering methods to receive asynchronous and
 * synchronous results.
 *
 * ---------------
 */
export default class Eventbus
{
   /**
    * Stores the name of this eventbus.
    *
    * @type {string}
    * @private
    */
   #name = '';

   /**
    * Stores the events map for associated events and callback / context data.
    *
    * @type {type.Events}
    * @private
    */
   #events;

   /**
    * Provides a constructor which optionally takes the eventbus name.
    *
    * @param {string}   name - Optional eventbus name.
    */
   constructor(name = '')
   {
      if (typeof name !== 'string') { throw new TypeError(`'name' is not a string`); }

      this.#name = name;

      /**
       * Stores the Listening instances for this context.
       *
       * @type {object.<string, Listening>}
       * @private
       */
      this._listeners = void 0;

      /**
       * A unique ID set when listened to.
       *
       * @type {string}
       * @private
       */
      this._listenId = void 0;

      /**
       * Stores the Listening instances for other contexts.
       *
       * @type {object.<string, Listening>}
       * @private
       */
      this._listeningTo = void 0;
   }

   /**
    * Just like `on`, but causes the bound callback to fire several times up to the count specified before being
    * removed. When multiple events are passed in using the space separated syntax, the event
    * will fire count times for every event you passed in, not once for a combination of all events.
    *
    * @param {number}            count - Number of times the function will fire before being removed.
    *
    * @param {string|object}     name - Event name(s) or event map.
    *
    * @param {Function|object}   callback - Event callback function or context for event map.
    *
    * @param {object}            [context] - Event context
    *
    * @param {boolean}           [guarded=false] - When set to true this registration is guarded.
    *
    * @returns {Eventbus} This Eventbus instance.
    */
   before(count, name, callback, context = void 0, guarded = false)
   {
      if (!Number.isInteger(count)) { throw new TypeError(`'count' is not an integer`); }

      const data = {};
      if (this.isGuarded(name, data))
      {
         console.warn(`@typhonjs-plugin/eventbus ${Utils.getErrorName(this)}`
          + `- before() failed as event name(s) are guarded: ${JSON.stringify(data.names)}`);
         return this;
      }

      // Map the event into a `{event: beforeWrapper}` object.
      const events = Utils.eventsAPI(Utils.beforeMap, {}, name, callback, { count, after: this.off.bind(this) });

      if (typeof name === 'string' && (context === null || context === void 0)) { callback = void 0; }

      return this.on(events, callback, context, guarded);
   }

   /**
    * Creates an EventbusProxy wrapping this Eventbus instance. An EventbusProxy proxies events allowing all listeners
    * added to be easily removed from the wrapped Eventbus.
    *
    * @returns {EventbusProxy} A new EventbusProxy for this eventbus.
    */
   createProxy()
   {
      return new EventbusProxy(this);
   }

   /**
    * Creates an EventbusSecure instance wrapping this Eventbus. An EventbusSecure instance provides a secure window to
    * public consumers with only trigger dispatch available.
    *
    * @param {string}   [name] - Optional name for the EventbusSecure instance.
    *
    * @returns {type.EventbusSecureObj} An EventbusSecure control object for this eventbus.
    */
   createSecure(name = void 0)
   {
      return EventbusSecure.initialize(this, name);
   }

   /**
    * Returns an iterable for all stored events yielding an array with event name, callback function, and event context.
    *
    * @param {RegExp} [regex] - Optional regular expression to filter event names.
    *
    * @yields
    */
   *entries(regex = void 0)
   {
      if (regex !== void 0 && !(regex instanceof RegExp)) { throw new TypeError(`'regex' is not a RegExp`); }

      if (!this.#events) { return; }

      if (regex)
      {
         for (const name in this.#events)
         {
            if (regex.test(name))
            {
               for (const event of this.#events[name])
               {
                  yield [name, event.callback, event.context, event.guarded];
               }
            }
         }
      }
      else
      {
         for (const name in this.#events)
         {
            for (const event of this.#events[name])
            {
               yield [name, event.callback, event.context, event.guarded];
            }
         }
      }
   }

   /**
    * Returns the current event count.
    *
    * @returns {number} Returns the current event count.
    */
   get eventCount()
   {
      if (!this.#events) { return 0; }

      return Object.keys(this.#events).length;
   }

   /**
    * Returns the current callback count.
    *
    * @returns {number} The current callback count.
    */
   get callbackCount()
   {
      if (!this.#events) { return 0; }

      let count = 0;

      for (const name in this.#events) { count += this.#events[name].length; }

      return count;
   }

   /**
    * Returns whether an event name is guarded.
    *
    * @param {string|object}  name - Event name(s) or event map to verify.
    *
    * @param {object}         [data] - Stores the output of which names are guarded.
    *
    * @returns {boolean} Whether the given event name is guarded.
    */
   isGuarded(name, data = {})
   {
      data.names = [];
      data.guarded = false;

      const result = Utils.eventsAPI(s_IS_GUARDED, data, name, void 0, { events: this.#events });

      return result.guarded;
   }

   /**
    * Returns an iterable for the event names / keys of registered event listeners.
    *
    * @param {RegExp} [regex] - Optional regular expression to filter event names.
    *
    * @yields
    */
   *keys(regex = void 0)
   {
      if (regex !== void 0 && !(regex instanceof RegExp)) { throw new TypeError(`'regex' is not a RegExp`); }

      if (!this.#events) { return; }

      if (regex)
      {
         for (const name in this.#events)
         {
            if (regex.test(name))
            {
               yield name;
            }
         }
      }
      else
      {
         for (const name in this.#events)
         {
            yield name;
         }
      }
   }

   /**
    * Returns the current eventbus name.
    *
    * @returns {string} The current eventbus name.
    */
   get name()
   {
      return this.#name;
   }

   /**
    * Tell an object to listen to a particular event on an other object. The advantage of using this form, instead of
    * other.on(event, callback, object), is that listenTo allows the object to keep track of the events, and they can
    * be removed all at once later on. The callback will always be called with object as context.
    *
    * @example
    * view.listenTo(model, 'change', view.render);
    *
    * @param {object}            obj - Event context
    *
    * @param {string|object}     name - Event name(s) or event map.
    *
    * @param {Function|object}   callback - Event callback function or context for event map.
    *
    * @returns {Eventbus} This Eventbus instance.
    */
   listenTo(obj, name, callback)
   {
      if (!obj) { return this; }

      const data = {};
      if (s_TRY_CATCH_IS_GUARDED(obj, name, data))
      {
         console.warn(`@typhonjs-plugin/eventbus ${Utils.getErrorName(this)}`
          + `- listenTo() failed as event name(s) are guarded for target object: ${JSON.stringify(data.names)}`);
         return this;
      }

      const id = obj._listenId || (obj._listenId = s_UNIQUE_ID('l'));
      const listeningTo = this._listeningTo || (this._listeningTo = {});
      let listening = _listening = listeningTo[id];

      // This object is not listening to any other events on `obj` yet.
      // Setup the necessary references to track the listening callbacks.
      if (!listening)
      {
         this._listenId || (this._listenId = s_UNIQUE_ID('l'));
         listening = _listening = listeningTo[id] = new Listening(this, obj);
      }

      // Bind callbacks on obj.
      const error = s_TRY_CATCH_ON(obj, name, callback, this);
      _listening = void 0;

      if (error) { throw error; }

      // If the target obj is not an Eventbus, track events manually.
      if (listening.interop) { listening.on(name, callback); }

      return this;
   }

   /**
    * Just like `listenTo`, but causes the bound callback to fire count times before being removed.
    *
    * @param {number}            count - Number of times the function will fire before being removed.
    *
    * @param {object}            obj - Target event context.
    *
    * @param {string|object}     name - Event name(s) or event map.
    *
    * @param {Function|object}   callback - Event callback function or context for event map.
    *
    * @returns {Eventbus} This Eventbus instance.
    */
   listenToBefore(count, obj, name, callback)
   {
      if (!Number.isInteger(count)) { throw new TypeError(`'count' is not an integer`); }

      // Map the event into a `{event: beforeWrapper}` object.
      const events = Utils.eventsAPI(Utils.beforeMap, {}, name, callback, {
         count,
         after: this.stopListening.bind(this, obj)
      });

      return this.listenTo(obj, events);
   }

   /**
    * Just like `listenTo`, but causes the bound callback to fire only once before being removed.
    *
    * @param {object}            obj - Target event context
    *
    * @param {string|object}     name - Event name(s) or event map.
    *
    * @param {Function|object}   callback - Event callback function or context for event map.
    *
    * @returns {Eventbus} This Eventbus instance.
    */
   listenToOnce(obj, name, callback)
   {
      // Map the event into a `{event: beforeWrapper}` object.
      const events = Utils.eventsAPI(Utils.beforeMap, {}, name, callback, {
         count: 1,
         after: this.stopListening.bind(this, obj)
      });

      return this.listenTo(obj, events);
   }

   /**
    * Remove a previously-bound callback function from an object. If no context is specified, all of the versions of
    * the callback with different contexts will be removed. If no callback is specified, all callbacks for the event
    * will be removed. If no event is specified, callbacks for all events will be removed.
    *
    * Note that calling model.off(), for example, will indeed remove all events on the model — including events that
    * Backbone uses for internal bookkeeping.
    *
    * @example
    * // Removes just the `onChange` callback.
    * object.off("change", onChange);
    *
    * // Removes all "change" callbacks.
    * object.off("change");
    *
    * // Removes the `onChange` callback for all events.
    * object.off(null, onChange);
    *
    * // Removes all callbacks for `context` for all events.
    * object.off(null, null, context);
    *
    * // Removes all callbacks on `object`.
    * object.off();
    *
    * @param {string|object}  [name] - Event name(s) or event map.
    *
    * @param {Function}       [callback] - Event callback function
    *
    * @param {object}         [context] - Event context
    *
    * @returns {Eventbus} This Eventbus instance.
    */
   off(name, callback = void 0, context = void 0)
   {
      if (!this.#events) { return this; }

      this.#events = Utils.eventsAPI(s_OFF_API, this.#events, name, callback, { context, listeners: this._listeners });

      return this;
   }

   /**
    * Bind a callback function to an object. The callback will be invoked whenever the event is fired. If you have a
    * large number of different events on a page, the convention is to use colons to namespace them: "poll:start", or
    * "change:selection".
    *
    * To supply a context value for this when the callback is invoked, pass the optional last argument:
    * model.on('change', this.render, this) or model.on({change: this.render}, this).
    *
    * @example
    * The event string may also be a space-delimited list of several events...
    * book.on("change:title change:author", ...);
    *
    * @example
    * Callbacks bound to the special "all" event will be triggered when any event occurs, and are passed the name of
    * the event as the first argument. For example, to proxy all events from one object to another:
    * proxy.on("all", function(eventName) {
    *    object.trigger(eventName);
    * });
    *
    * @example
    * All Backbone event methods also support an event map syntax, as an alternative to positional arguments:
    * book.on({
    *    "change:author": authorPane.update,
    *    "change:title change:subtitle": titleView.update,
    *    "destroy": bookView.remove
    * });
    *
    * @param {string|object}     name - Event name(s) or event map.
    *
    * @param {Function|object}   callback - Event callback function or context for event map.
    *
    * @param {object}            [context] - Event context
    *
    * @param {boolean}           [guarded=false] - When set to true this registration is guarded.
    *
    * @returns {Eventbus} This Eventbus instance.
    */
   on(name, callback, context = void 0, guarded = false)
   {
      const data = {};
      if (this.isGuarded(name, data))
      {
         console.warn(`@typhonjs-plugin/eventbus ${Utils.getErrorName(this)}`
          + `- on() failed as event name(s) are guarded: ${JSON.stringify(data.names)}`);
         return this;
      }

      this.#events = Utils.eventsAPI(s_ON_API, this.#events || {}, name, callback, {
         context,
         ctx: this,
         guarded,
         listening: _listening
      });

      if (_listening)
      {
         const listeners = this._listeners || (this._listeners = {});
         listeners[_listening.id] = _listening;

         // Allow the listening to use a counter, instead of tracking callbacks for library interop.
         _listening.interop = false;
      }

      return this;
   }

   /**
    * Just like `on`, but causes the bound callback to fire only once before being removed. Handy for saying "the next
    * time that X happens, do this". When multiple events are passed in using the space separated syntax, the event
    * will fire once for every event you passed in, not once for a combination of all events
    *
    * @param {string|object}     name - Event name(s) or event map.
    *
    * @param {Function|object}   callback - Event callback function or context for event map.
    *
    * @param {object}            [context] - Event context
    *
    * @param {boolean}           [guarded=false] - When set to true this registration is guarded.
    *
    * @returns {Eventbus} This Eventbus instance.
    */
   once(name, callback, context = void 0, guarded = false)
   {
      const data = {};
      if (this.isGuarded(name, data))
      {
         console.warn(`@typhonjs-plugin/eventbus ${Utils.getErrorName(this)}`
          + `- once() failed as event name(s) are guarded: ${JSON.stringify(data.names)}`);
         return this;
      }

      // Map the event into a `{event: beforeWrapper}` object.
      const events = Utils.eventsAPI(Utils.beforeMap, {}, name, callback, { count: 1, after: this.off.bind(this) });

      if (typeof name === 'string' && (context === null || context === void 0)) { callback = void 0; }

      return this.on(events, callback, context, guarded);
   }

   /**
    * Tell an object to stop listening to events. Either call stopListening with no arguments to have the object remove
    * all of its registered callbacks ... or be more precise by telling it to remove just the events it's listening to
    * on a specific object, or a specific event, or just a specific callback.
    *
    * @example
    * view.stopListening();
    *
    * view.stopListening(model);
    *
    * @param {object}   obj - Event context
    *
    * @param {string}   [name] - Event name(s)
    *
    * @param {Function} [callback] - Event callback function
    *
    * @returns {Eventbus} This Eventbus instance.
    */
   stopListening(obj, name = void 0, callback = void 0)
   {
      const listeningTo = this._listeningTo;
      if (!listeningTo) { return this; }

      const ids = obj ? [obj._listenId] : Utils.objectKeys(listeningTo);

      for (let i = 0; i < ids.length; i++)
      {
         const listening = listeningTo[ids[i]];

         // If listening doesn't exist, this object is not currently listening to obj. Break out early.
         if (!listening) { break; }

         listening.obj.off(name, callback, this);

         if (listening.interop) { listening.off(name, callback); }
      }

      return this;
   }

   /**
    * Trigger callbacks for the given event, or space-delimited list of events. Subsequent arguments to trigger will be
    * passed along to the event callbacks.
    *
    * @param {string}   name - Event name(s)
    *
    * @param {...*}     args - Additional arguments passed to the event function(s).
    *
    * @returns {Eventbus} This Eventbus instance.
    */
   trigger(name, ...args)
   {
      if (!this.#events) { return this; }

      s_RESULTS_TARGET_API(s_TRIGGER_API, s_TRIGGER_EVENTS, this.#events, name, void 0, args);

      return this;
   }

   /**
    * Provides `trigger` functionality, but collects any returned Promises from invoked targets and returns a
    * single Promise generated by `Promise.resolve` for a single value or `Promise.all` for multiple results. This is
    * a very useful mechanism to invoke asynchronous operations over an eventbus.
    *
    * @param {string}   name - Event name(s)
    *
    * @param {...*}     args - Additional arguments passed to the event function(s).
    *
    * @returns {Promise<void|*|*[]>} A Promise with any results.
    */
   async triggerAsync(name, ...args)
   {
      if (!this.#events) { return void 0; }

      const result = s_RESULTS_TARGET_API(s_TRIGGER_API, s_TRIGGER_ASYNC_EVENTS, this.#events, name, void 0, args);

      // No event callbacks were triggered.
      if (result === void 0) { return void 0; }

      // A single Promise has been returned; just return it.
      if (!Array.isArray(result)) { return result; }

      // Multiple events & callbacks have been triggered so reduce the returned array of Promises and filter all
      // values from each Promise result removing any undefined values.
      return Promise.all(result).then((results) =>
      {
         let allResults = [];

         for (const pResult of results)
         {
            if (Array.isArray(pResult))
            {
               allResults = allResults.concat(pResult);
            }
            else if (pResult !== void 0)
            {
               allResults.push(pResult);
            }
         }

         return allResults.length > 1 ? allResults : allResults.length === 1 ? allResults[0] : void 0;
      });
   }

   /**
    * Defers invoking `trigger`. This is useful for triggering events in the next clock tick.
    *
    * @param {string}   name - Event name(s)
    *
    * @param {...*}     args - Additional arguments passed to the event function(s).
    *
    * @returns {Eventbus} This Eventbus instance.
    */
   triggerDefer(name, ...args)
   {
      setTimeout(() => { this.trigger(name, ...args); }, 0);

      return this;
   }

   /**
    * Provides `trigger` functionality, but collects any returned result or results from invoked targets as a single
    * value or in an array and passes it back to the callee in a synchronous manner.
    *
    * @param {string}   name - Event name(s).
    *
    * @param {...*}     args - Additional arguments passed to the event function(s).
    *
    * @returns {void|*|*[]} The results of the event invocation.
    */
   triggerSync(name, ...args)
   {
      if (!this.#events) { return void 0; }

      return s_RESULTS_TARGET_API(s_TRIGGER_API, s_TRIGGER_SYNC_EVENTS, this.#events, name, void 0, args);
   }
}

// Private / internal methods ---------------------------------------------------------------------------------------

/**
 * Global listening object
 *
 * @type {Listening}
 */
let _listening;

/**
 * A listening class that tracks and cleans up memory bindings when all callbacks have been offed.
 */
class Listening
{
   /**
    * @type {type.Events}
    */
   #events;

   /**
    * @type {string}
    */
   #id;

   /**
    * @type {object}
    */
   #listener;

   /**
    * @type {object}
    */
   #obj;

   /**
    * @type {boolean}
    */
   #interop;

   /**
    * Current listening count.
    *
    * @type {number}
    */
   #count = 0;

   constructor(listener, obj)
   {
      this.#id = listener._listenId;
      this.#listener = listener;
      this.#obj = obj;
      this.#interop = true;
   }

   // Cleans up memory bindings between the listener and the listenee.
   cleanup()
   {
      delete this.#listener._listeningTo[this.#obj._listenId];
      if (!this.#interop) { delete this.#obj._listeners[this.#id]; }
   }

   get id() { return this.#id; }

   get interop() { return this.#interop; }

   get obj() { return this.#obj; }

   incrementCount() { this.#count++; }

   /**
    * @see {@link Eventbus#on}
    *
    * @param {string|object}     name - Event name(s) or event map.
    *
    * @param {Function|object}   callback - Event callback function or context for event map.
    *
    * @param {object}            [context] - Event context
    *
    * @returns {Listening} This Listening instance.
    */
   on(name, callback, context = void 0)
   {
      this.#events = Utils.eventsAPI(s_ON_API, this.#events || {}, name, callback,
      {
         context,
         ctx: this,
         listening: this
      });

      return this;
   }

   /**
    * Offs a callback (or several). Uses an optimized counter if the listenee uses Eventbus. Otherwise, falls back to
    * manual tracking to support events library interop.
    *
    * @param {string|object}     [name] - Event name(s) or event map.
    *
    * @param {Function|object}   [callback] - Event callback function or context for event map.
    */
   off(name, callback)
   {
      let cleanup;

      if (this.#interop)
      {
         this.#events = Utils.eventsAPI(s_OFF_API, this.#events, name, callback, {
            context: void 0,
            listeners: void 0
         });
         cleanup = !this.#events;
      }
      else
      {
         this.#count--;
         cleanup = this.#count === 0;
      }

      if (cleanup) { this.cleanup(); }
   }

   /**
    * Sets interop.
    *
    * @param {boolean} value Value to set.
    */
   set interop(value)
   {
      /* c8 ignore next 1 */
      if (typeof value !== 'boolean') { throw new TypeError(`'value' is not a boolean`); }
      this.#interop = value
   }
}

/**
 * The reducing API that tests if an event name is guarded. Any event data of a give event name can have the guarded
 * state set. If so the event name will be added to the output names array and `output.guarded` set to true.
 *
 * @param {object}   output - The output object.
 *
 * @param {string}   name - Event name
 *
 * @param {Function} callback - Event callback
 *
 * @param {object}   opts - Optional parameters
 *
 * @returns {object} The output object.
 */
const s_IS_GUARDED = (output, name, callback, opts) =>
{
   const events = opts.events;

   if (events)
   {
      const handlers = events[name];

      if (Array.isArray(handlers))
      {
         for (const handler of handlers)
         {
            if (handler.guarded)
            {
                output.names.push(name);
                output.guarded = true;
                return output;
            }
         }
      }
   }

   return output;
}

/**
 * The reducing API that removes a callback from the `events` object.
 *
 * @param {type.Events}   events - Events object
 *
 * @param {string}   name - Event name
 *
 * @param {Function} callback - Event callback
 *
 * @param {object}   opts - Optional parameters
 *
 * @returns {void|type.Events} Events object
 */
const s_OFF_API = (events, name, callback, opts) =>
{
   /* c8 ignore next 1 */
   if (!events) { return; }

   const context = opts.context, listeners = opts.listeners;
   let i = 0, names;

   // Delete all event listeners and "drop" events.
   if (!name && !context && !callback)
   {
      for (names = Utils.objectKeys(listeners); i < names.length; i++)
      {
         listeners[names[i]].cleanup();
      }
      return;
   }

   names = name ? [name] : Utils.objectKeys(events);

   for (; i < names.length; i++)
   {
      name = names[i];
      const handlers = events[name];

      // Bail out if there are no events stored.
      if (!handlers) { break; }

      // Find any remaining events.
      const remaining = [];
      for (let j = 0; j < handlers.length; j++)
      {
         const handler = handlers[j];
         if (callback && callback !== handler.callback && callback !== handler.callback._callback ||
          context && context !== handler.context)
         {
            remaining.push(handler);
         }
         else
         {
            const listening = handler.listening;
            if (listening) { listening.off(name, callback); }
         }
      }

      // Replace events if there are any remaining.  Otherwise, clean up.
      if (remaining.length)
      {
         events[name] = remaining;
      }
      else
      {
         delete events[name];
      }
   }

   return events;
};

/**
 * The reducing API that adds a callback to the `events` object.
 *
 * @param {type.Events}   events - Events object
 *
 * @param {string}   name - Event name
 *
 * @param {Function} callback - Event callback
 *
 * @param {object}   opts - Optional parameters
 *
 * @returns {type.Events} Events object.
 */
const s_ON_API = (events, name, callback, opts) =>
{
   if (callback)
   {
      const handlers = events[name] || (events[name] = []);
      const context = opts.context, ctx = opts.ctx, listening = opts.listening;
      const guarded = typeof opts.guarded === 'boolean' ? opts.guarded : false;

      if (listening) { listening.incrementCount(); }

      handlers.push({ callback, context, ctx: context || ctx, guarded, listening });
   }
   return events;
};

/**
 * Iterates over the standard `event, callback` (as well as the fancy multiple space-separated events `"change blur",
 * callback` and jQuery-style event maps `{event: callback}`).
 *
 * @param {Function} iteratee - Trigger API
 *
 * @param {Function} iterateeTarget - Internal function which is dispatched to.
 *
 * @param {type.Events}   events - Array of stored event callback data.
 *
 * @param {string}   name - Event name
 *
 * @param {Function} callback - callback
 *
 * @param {object}   opts - Optional parameters
 *
 * @returns {*} The results of the callback if any.
 */
const s_RESULTS_TARGET_API = (iteratee, iterateeTarget, events, name, callback, opts) =>
{
   let results = void 0;
   let i = 0, names;

   // Handle the case of multiple events being triggered. The potential results of each event & callbacks must be
   // processed into a single array of results.
   if (name && Utils.eventSplitter.test(name))
   {
      // Handle space-separated event names by delegating them individually.
      for (names = name.split(Utils.eventSplitter); i < names.length; i++)
      {
         const result = iteratee(iterateeTarget, events, names[i], callback, opts);

         // Determine type of `results`; 0: undefined, 1: single value, 2: an array of values.
         const resultsType = Array.isArray(results) ? 2 : results !== void 0 ? 1 : 0;

         // Handle an array result depending on existing results value.
         if (Array.isArray(result))
         {
            switch (resultsType)
            {
               case 0:
                  // Simply set results.
                  results = result;
                  break;
               case 1:
                  // Create a new array from existing results then concat the new result array.
                  results = [results].concat(result);
                  break;
               case 2:
                  // `results` is already an array so concat the new result array.
                  results = results.concat(result);
                  break;
            }
         }
         else if (result !== void 0)
         {
            switch (resultsType)
            {
               case 0:
                  // Simply set results.
                  results = result;
                  break;
               case 1: {
                  // Create a new array from existing results then push the new result value.
                  const newArray = [results];
                  newArray.push(result);
                  results = newArray;
                  break;
               }
               case 2:
                  // `results` is already an array so push the new result array.
                  results.push(result);
                  break;
            }
         }
      }
   }
   else
   {
      // Just single event.
      results = iteratee(iterateeTarget, events, name, callback, opts);
   }

   return results;
};

/**
 * Handles triggering the appropriate event callbacks.
 *
 * @param {Function} iterateeTarget - Internal function which is dispatched to.
 *
 * @param {type.Events}   objEvents - Array of stored event callback data.
 *
 * @param {string}   name - Event name
 *
 * @param {Function} callback - callback
 *
 * @param {*[]}      args - Arguments supplied to a trigger method.
 *
 * @returns {*} The results from the triggered event.
 */
const s_TRIGGER_API = (iterateeTarget, objEvents, name, callback, args) =>
{
   let result;

   if (objEvents)
   {
      const events = objEvents[name];
      let allEvents = objEvents.all;
      if (events && allEvents) { allEvents = allEvents.slice(); }
      if (events) { result = iterateeTarget(events, args); }
      if (allEvents) { result = iterateeTarget(allEvents, [name].concat(args)); }
   }

   return result;
};

/**
 * A difficult-to-believe, but optimized internal dispatch function for triggering events. Tries to keep the usual
 * cases speedy (most internal Backbone events have 3 arguments).
 *
 * @param {type.EventData[]} events - Array of stored event callback data.
 *
 * @param {*[]}         args - Event argument array
 */
const s_TRIGGER_EVENTS = (events, args) =>
{
   let ev, i = -1;
   const a1 = args[0], a2 = args[1], a3 = args[2], l = events.length;

   switch (args.length)
   {
      case 0:
         while (++i < l) { (ev = events[i]).callback.call(ev.ctx); }
         return;
      case 1:
         while (++i < l) { (ev = events[i]).callback.call(ev.ctx, a1); }
         return;
      case 2:
         while (++i < l) { (ev = events[i]).callback.call(ev.ctx, a1, a2); }
         return;
      case 3:
         while (++i < l) { (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); }
         return;
      default:
         while (++i < l) { (ev = events[i]).callback.apply(ev.ctx, args); }
         return;
   }
};

/**
 * A difficult-to-believe, but optimized internal dispatch function for triggering events. Tries to keep the usual
 * cases speedy (most internal Backbone events have 3 arguments). This dispatch method uses ES6 Promises and adds
 * any returned results to an array which is added to a Promise.all construction which passes back a Promise which
 * waits until all Promises complete. Any target invoked may return a Promise or any result. This is very useful to
 * use for any asynchronous operations.
 *
 * @param {type.EventData[]} events - Array of stored event callback data.
 *
 * @param {*[]}         args - Arguments supplied to `triggerAsync`.
 *
 * @returns {Promise<void|*|*[]>} A Promise of the results from the triggered event.
 */
const s_TRIGGER_ASYNC_EVENTS = async (events, args) =>
{
   let ev, i = -1;
   const a1 = args[0], a2 = args[1], a3 = args[2], l = events.length;

   const results = [];

   switch (args.length)
   {
      case 0:
         while (++i < l)
         {
            const result = (ev = events[i]).callback.call(ev.ctx);

            // If we received a valid result add it to the promises array.
            if (result !== void 0) { results.push(result); }
         }
         break;

      case 1:
         while (++i < l)
         {
            const result = (ev = events[i]).callback.call(ev.ctx, a1);

            // If we received a valid result add it to the promises array.
            if (result !== void 0) { results.push(result); }
         }
         break;

      case 2:
         while (++i < l)
         {
            const result = (ev = events[i]).callback.call(ev.ctx, a1, a2);

            // If we received a valid result add it to the promises array.
            if (result !== void 0) { results.push(result); }
         }
         break;

      case 3:
         while (++i < l)
         {
            const result = (ev = events[i]).callback.call(ev.ctx, a1, a2, a3);

            // If we received a valid result add it to the promises array.
            if (result !== void 0) { results.push(result); }
         }
         break;

      default:
         while (++i < l)
         {
            const result = (ev = events[i]).callback.apply(ev.ctx, args);

            // If we received a valid result add it to the promises array.
            if (result !== void 0) { results.push(result); }
         }
         break;
   }

   // If there are multiple results then use Promise.all otherwise Promise.resolve. Filter out any undefined results.
   return results.length > 1 ? Promise.all(results).then((values) =>
   {
      const filtered = values.filter((entry) => entry !== void 0);
      switch (filtered.length)
      {
         case 0: return void 0;
         case 1: return filtered[0];
         default: return filtered;
      }
   }) : results.length === 1 ? results[0] : void 0;
};

/**
 * A difficult-to-believe, but optimized internal dispatch function for triggering events. Tries to keep the usual
 * cases speedy (most internal Backbone events have 3 arguments). This dispatch method synchronously passes back a
 * single value or an array with all results returned by any invoked targets.
 *
 * @param {type.EventData[]} events - Array of stored event callback data.
 *
 * @param {*[]}         args - Arguments supplied to `triggerSync`.
 *
 * @returns {void|*|*[]} The results from the triggered event.
 */
const s_TRIGGER_SYNC_EVENTS = (events, args) =>
{
   let ev, i = -1;
   const a1 = args[0], a2 = args[1], a3 = args[2], l = events.length;

   const results = [];

   switch (args.length)
   {
      case 0:
         while (++i < l)
         {
            const result = (ev = events[i]).callback.call(ev.ctx);

            // If we received a valid result return immediately.
            if (result !== void 0) { results.push(result); }
         }
         break;
      case 1:
         while (++i < l)
         {
            const result = (ev = events[i]).callback.call(ev.ctx, a1);

            // If we received a valid result return immediately.
            if (result !== void 0) { results.push(result); }
         }
         break;
      case 2:
         while (++i < l)
         {
            const result = (ev = events[i]).callback.call(ev.ctx, a1, a2);

            // If we received a valid result return immediately.
            if (result !== void 0) { results.push(result); }
         }
         break;
      case 3:
         while (++i < l)
         {
            const result = (ev = events[i]).callback.call(ev.ctx, a1, a2, a3);

            // If we received a valid result return immediately.
            if (result !== void 0) { results.push(result); }
         }
         break;
      default:
         while (++i < l)
         {
            const result = (ev = events[i]).callback.apply(ev.ctx, args);

            // If we received a valid result return immediately.
            if (result !== void 0) { results.push(result); }
         }
         break;
   }

   // Return the results array if there are more than one or just a single result.
   return results.length > 1 ? results : results.length === 1 ? results[0] : void 0;
};

/**
 * A try-catch guarded function. Used when attempting to invoke `isGuarded` from an other eventbus / context via
 * `listenTo`.
 *
 * @param {object}         obj - Event target / context
 *
 * @param {string|object}  name - Event name(s) or event map.
 *
 * @param {object}         data - Output data.
 *
 * @returns {boolean} Any error if thrown.
 */
const s_TRY_CATCH_IS_GUARDED = (obj, name, data = {}) =>
{
   let guarded = false;

   try
   {
      const result = obj.isGuarded(name, data);
      if (typeof result === 'boolean') { guarded = result; }
   }
   catch (err)
   {
      guarded = false;
      data.names = [];
      data.guarded = false;
   }

   return guarded;
};

/**
 * A try-catch guarded #on function, to prevent poisoning the global `_listening` variable. Used when attempting to
 * invoke `on` from an other eventbus / context via `listenTo`.
 *
 * @param {object}            obj - Event target / context
 *
 * @param {string|object}     name - Event name(s) or event map.
 *
 * @param {Function|object}   callback - Event callback function or context for event map.
 *
 * @param {object}            [context] - Event context
 *
 * @returns {Error} Any error if thrown.
 */
const s_TRY_CATCH_ON = (obj, name, callback, context) =>
{
   try
   {
      obj.on(name, callback, context);
   }
   catch (err)
   {
      return err;
   }
};

/**
 * Generate a unique integer ID (unique within the entire client session).
 *
 * @type {number} - unique ID counter.
 */
let idCounter = 0;

/**
 * Creates a new unique ID with a given prefix
 *
 * @param {string}   prefix - An optional prefix to add to unique ID.
 *
 * @returns {string} A new unique ID with a given prefix.
 */
const s_UNIQUE_ID = (prefix = '') =>
{
   const id = `${++idCounter}`;
   return prefix ? `${prefix}${id}` /* c8 ignore next */ : id;
};
