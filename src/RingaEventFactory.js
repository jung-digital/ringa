import RingaEvent from './RingaEvent';
import { mergeRingaEventDetails } from './util/ringaEvent';
import {getArgNames} from './util/function';
import {buildArgumentsFromRingaEvent} from './util/executors';

class RingaEventFactory {
  //-----------------------------------
  // Constructor
  //-----------------------------------
  constructor(eventType, detail, domNode, requireCatch = false, bubbles = true, cancellable = true, event = undefined) {
    this.eventType = eventType;
    this.detailOrig = detail;
    this.domNode = domNode;
    this.bubbles = true;
    this.cancellable = true;
    this.requireCatch = requireCatch;
    this.event = event;
  }

  //-----------------------------------
  // Methods
  //-----------------------------------
  build(executor) {
    let detail;

    if (typeof this.detailOrig === 'function') {
      let argNames = getArgNames(this.detailOrig);
      let args = buildArgumentsFromRingaEvent(executor, argNames, executor.ringaEvent);
      detail = this.detailOrig.apply(undefined, args);
    } else {
      detail = this.detailOrig;
    }

    let newDetail = mergeRingaEventDetails(executor.ringaEvent, detail, executor.controller.options.warnOnDetailOverwrite);

    newDetail._executor = executor;

    return new RingaEvent(this.eventType, newDetail, this.bubbles, this.cancellable, this.event, this.requireCatch);
  }

  toString() {
    return 'RingaEventFactory_' + this.eventType;
  }
}

export default RingaEventFactory;