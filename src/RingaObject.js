export const ids = {
  map: {},
  counts: new WeakMap()
};

export default class RingaObject {
  //-----------------------------------
  // Constructor
  //-----------------------------------
  constructor(name, id) {
    ids.counts[this.constructor] = ids.counts[this.constructor] || 1;

    if (id) {
      this.id = id;
    } else {
      this._id = this.constructor.name + ids.counts[this.constructor];
    }

    ids.counts[this.constructor]++;

    this._name = name;
  }

  //-----------------------------------
  // Properties
  //-----------------------------------
  set id(value) {
    if (ids.map[value]) {
      console.warn(`Duplicate Ringa id discovered: '${value}' for '${this.constructor.name}'. Call RingaObject::destroy() to clear up the id.`);
    }

    ids.map[value] = true; // We do not create a reference to the object because this would create a memory leak.

    this._id = value;
  }

  get id() {
    return this._id;
  }

  get name() {
    return this._name;
  }

  //-----------------------------------
  // Methods
  //-----------------------------------
  destroy() {
    delete ids[this.id];
  }

  toString(value) {
    return this.name + '_' + (value || '');
  }
};
