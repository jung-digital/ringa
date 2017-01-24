import CommandThreadFactory from './CommandThreadFactory';
import RingObject from './RingObject';
import HashArray from 'hasharray';
import RingEvent from './RingEvent';

/**
 * Controller is the hub for events dispatched on the DOM invoking threads of commands.
 */
class Controller extends RingObject {
  //-----------------------------------
  // Constructor
  //-----------------------------------
  /**
   * Constructs a new controller.
   *
   * @param id The id of this controller, primarily used for internal hashes and debugging. Must be unique.
   * @param domNode The native browser DOMNode element (not a React Node) to attach event listeners to.
   * @param options See documentation on Controller options. Defaults are provided, so this is optional.
   */
  constructor(id, domNode, options) {
    super(id);

    if (!domNode) {
      throw Error('Controller:constructor(): no DOMNode provided to constructor!');
    }

    this.domNode = domNode;

    this.options = options || {};
    this.options.timeout = this.options.timeout || 5000;
    this.options.throwKillsThread = this.options.throwKillsThread === undefined ? true : false;
    this.options.consoleLogFails = this.options.consoleLogFails === undefined ? true : false;
    this.options.injections = this.options.injections || {};

    this.commandThreads = new HashArray('id');

    this.eventTypeToCommandThreadFactory = new Map();

    this._eventHandler = this._eventHandler.bind(this);
  }

  //-----------------------------------
  // Methods
  //-----------------------------------
  getListener(eventType) {
    return this.eventTypeToCommandThreadFactory[eventType];
  }

  addListener(eventType, commandThreadFactoryOrArray) {
    let commandThreadFactory;

    if (!commandThreadFactoryOrArray || commandThreadFactoryOrArray instanceof Array) {
      commandThreadFactory = new CommandThreadFactory(this.id + '_' + eventType + '_CommandThreadFactory', commandThreadFactoryOrArray);
    } else if (typeof commandThreadFactoryOrArray.build === 'function') {
      commandThreadFactory = commandThreadFactoryOrArray;
    } else {
      throw Error('Controller::addListener(): the provided commandThreadFactoryOrArray is not valid!');
    }

    if (!commandThreadFactory || !(commandThreadFactory instanceof CommandThreadFactory)) {
      throw Error('Controller::addListener(): commandThreadFactory not an instance of CommandThreadFactory');
    }

    if (commandThreadFactory.controller) {
      throw Error('Controller::addListener(): commandThreadFactory cannot have two parent controllers!');
    }

    if (this.eventTypeToCommandThreadFactory[eventType]) {
      throw Error('Controller.addListener(): the event \'' + eventType + '\' has already been added! Use getListener() to make modifications.');
    }

    commandThreadFactory.controller = this;

    this.eventTypeToCommandThreadFactory[eventType] = commandThreadFactory;

    if (typeof eventType === 'string') {
      this.domNode.addEventListener(eventType, this._eventHandler);
    } else {
      let _eventType = undefined;

      if (eventType.hasOwnProperty('toString')) {
        _eventType = eventType.toString();
      }

      if (_eventType) {
        this.domNode.addEventListener(_eventType, this._eventHandler.bind(this));
      } else {
        throw Error('Controller::addListener(): provided eventType is invalid.', eventType);
      }
    }

    return commandThreadFactory;
  }

  removeListener(eventType) {
    let commandThreadFactory = this.eventTypeToCommandThreadFactory[eventType];

    if (commandThreadFactory) {
      delete this.eventTypeToCommandThreadFactory[eventType];

      this.domNode.removeEventListener(eventType, this._eventHandler);

      return commandThreadFactory;
    }

    throw Error('Controller:removeListener(): could not find a listener for \'' + eventType + '\'', this);
  }

  hasListener(eventType) {
    return this.getListener(eventType) !== undefined;
  }

  invoke(ringEvent, commandThreadFactory) {
    let commandThread = commandThreadFactory.build(ringEvent);

    this.commandThreads.add(commandThread);

    ringEvent._dispatchEvent(RingEvent.PREHOOK);

    commandThread.run(ringEvent, this.threadDoneHandler.bind(this), this.threadFailHandler.bind(this));

    return commandThread;
  }

  //-----------------------------------
  // Events
  //-----------------------------------
  _eventHandler(customEvent) {
    // This event might be a something like 'click' which does not have
    // an attached ringEvent yet!
    customEvent.detail.ringEvent = customEvent.detail.ringEvent || new RingEvent(customEvent.type, customEvent.detail, customEvent.bubbles, customEvent.cancellable);

    if (customEvent.detail.ringEvent.controller) {
      throw Error('Controller::_eventHandler(): event was received that has already been handled by another controller: ' + customEvent);
    }

    customEvent.detail.ringEvent.controller = this;

    let commandThreadFactory = this.eventTypeToCommandThreadFactory[customEvent.type];

    if (!commandThreadFactory) {
      throw Error('Controller::_eventHandler(): caught an event but there is no associated CommandThreadFactory! Fatal error.');
    }

    customEvent.detail.ringEvent.caught = true;

    let abort;
    try {
      abort = this.preInvokeHandler(customEvent.detail.ringEvent);
    } catch (error) {
      // At this point we don't have a thread yet, so this is all kinds of whack.
      if (this.options.consoleLogFails) {
        console.error(error);
      }

      customEvent.detail.ringEvent._fail(error);
    }

    if (abort === true) {
      return;
    }

    try {
      let commandThread = this.invoke(customEvent.detail.ringEvent, commandThreadFactory);

      this.postInvokeHandler(customEvent.detail.ringEvent, commandThread);
    } catch (error) {
      this.threadFailHandler(commandThread, error);
    }
  }

  preInvokeHandler(ringEvent) {
    // Can be extended by a subclass
    return false;
  }

  postInvokeHandler(ringEvent, commandThread) {
    // Can be extended by a subclass
  }

  threadDoneHandler(commandThread) {
    if (!this.commandThreads.has(commandThread.id)) {
      throw Error(`Controller::threadDoneHandler(): could not find thread with id ${commandThread.id}`);
    }

    this.commandThreads.remove(commandThread);

    commandThread.ringEvent._done();
  }

  threadFailHandler(commandThread, error) {
    if (this.options.consoleLogFails) {
      console.error(error);
    }

    if (this.commandThreads.has(commandThread.id)) {
      this.commandThreads.remove(commandThread);
    } else {
      throw Error(`Controller:threadFailHandler(): the CommandThread with the id ${commandThread.id} was not found.`)
    }

    commandThread.ringEvent._fail(error);
  }

  dispatch(eventType, details) {
    return new RingEvent(eventType, details).dispatch(this.domNode);
  }
}

export default Controller;