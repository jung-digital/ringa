/* eslint-disable no-unused-vars */

window.__DEV__ = true;

import TestUtils from 'react-addons-test-utils';
import React from 'react';
import ReactDOM from 'react-dom';
import Ring from '../src/index';
import TestController from './shared/TestController';
import CommandSimple from './shared/CommandSimple';

const TEST_EVENT = 'testEvent';
const TEST_EVENT2 = 'testEvent2';

describe('LifeCycle (event -> controller -> thread -> command', () => {
  let command, domNode, reactNode, commandThreadFactory,
      commandThreadFactory2, controller;

  beforeEach(() => {
    domNode = ReactDOM.findDOMNode(TestUtils.renderIntoDocument(
      <div>Controller Attach Point</div>
    ));

    controller = new TestController('testController', domNode, {
      timeout: 50
    });

    commandThreadFactory = controller.addListener(TEST_EVENT);
    commandThreadFactory2 = controller.addListener(TEST_EVENT2);
  });

  //-----------------------------------
  // RingEvent -> 1 Command
  //-----------------------------------
  it('RingEvent -> 1 Command', (done) => {
    let testObject = {
      value: 'test'
    };

    commandThreadFactory.add(CommandSimple);

    let ringEvent = Ring.dispatch(TEST_EVENT, { testObject }, domNode).addDoneListener(() => {
      expect(testObject.executed).toEqual(true);
      done();
    });
  });

  //-----------------------------------
  // RingEvent -> 2 Commands
  //-----------------------------------
  it('RingEvent -> 2 Commands', (done) => {
    let testObject = {
      value: 'test'
    };

    commandThreadFactory.addAll([CommandSimple,CommandSimple]);

    let ringEvent = Ring.dispatch(TEST_EVENT, { testObject }, domNode);

    ringEvent.addDoneListener(() => {
      expect(testObject.count).toEqual(2);
      done();
    });
  });

  //-----------------------------------
  // RingEvent -> 1 Function
  //-----------------------------------
  it('RingEvent -> 1 Function', (done) => {
    let a = 0;

    commandThreadFactory.add(() => {
      a = 1;
    });

    let ringEvent = Ring.dispatch(TEST_EVENT, undefined, domNode);

    ringEvent.addDoneListener(() => {
      expect(a).toEqual(1);
      done();
    });
  });

  //-----------------------------------
  // RingEvent -> 2 Functions
  //-----------------------------------
  it('RingEvent -> 2 Functions', (done) => {
    let a = 0;

    commandThreadFactory.add(() => {
      a = 1;
    },() => {
      a = 2;
    });

    let ringEvent = Ring.dispatch(TEST_EVENT, undefined, domNode);

    ringEvent.addDoneListener(() => {
      expect(a).toEqual(2);
      done();
    });
  });

  //-----------------------------------
  // RingEvent -> 1 Function, modify event
  //-----------------------------------
  it('RingEvent -> 1 Function, modify event', (done) => {
    let obj = {};

    commandThreadFactory.add((ringEvent) => {
      ringEvent.detail.itsWorking = true;
    });

    let ringEvent = Ring.dispatch(TEST_EVENT, obj, domNode);

    ringEvent.addDoneListener(() => {
      expect(obj.itsWorking).toEqual(true);
      done();
    });
  });

  //-----------------------------------
  // RingEvent -> 2 Functions, modify event
  //-----------------------------------
  it('RingEvent -> 2 Functions, modify event', (done) => {
    let obj = {};

    commandThreadFactory.add((ringEvent) => {
      ringEvent.detail.test1 = true;
    });

    commandThreadFactory.add((ringEvent) => {
      ringEvent.detail.test2 = true;
    });

    let ringEvent = Ring.dispatch(TEST_EVENT, obj, domNode);

    ringEvent.addDoneListener(() => {
      expect(obj.test1).toEqual(true);
      expect(obj.test2).toEqual(true);
      done();
    });
  });

  //-----------------------------------
  // RingEvent -> Ring.dispatch
  //-----------------------------------
  it('RingEvent -> Ring.dispatch', (done) => {
    let ringEvent2, ringEvent;
    let obj = {}, obj2 = {};

    commandThreadFactory.add((ringEvent) => {
      ringEvent.detail.test1 = true;
      ringEvent2 = Ring.dispatch(TEST_EVENT2, obj2, domNode);

      ringEvent2.addDoneListener(() => {
        expect(obj.test1).toEqual(true);
        expect(obj2.test2).toEqual(true);
        expect(ringEvent.detail.test1).toEqual(true);
        expect(ringEvent2.detail.test2).toEqual(true);
        done();
      });
    });

    commandThreadFactory2.add((ringEvent) => {
      ringEvent.detail.test2 = true;
    });

    ringEvent = Ring.dispatch(TEST_EVENT, obj, domNode);
  }, 50);

  //-----------------------------------
  // RingEvent -> CommandEventWrapper
  //-----------------------------------
  it('RingEvent -> CommandEventWrapper', (done) => {
    let ringEvent, ringEvent2;
    let obj = {};

    commandThreadFactory.add(TEST_EVENT2);

    commandThreadFactory2.add((ringEvent) => {
      ringEvent.detail.test2 = true;

      ringEvent2 = ringEvent;
    });

    ringEvent = Ring.dispatch(TEST_EVENT, obj, domNode);

    // This should not be called until the second ringevent is done!
    ringEvent.addDoneListener(() => {
      expect(ringEvent2.detail.test2).toEqual(true);
      done();
    });
  }, 50);
});
