const registry = new Map();

class Queue {
  constructor(name) {
    this.name = name;
    this.jobs = [];
    registry.set(name, this);
  }

  async add(jobName, data) {
    const job = { id: `mock-${this.jobs.length}`, jobName, data };
    this.jobs.push(job);
    return job;
  }

  async close() {}
}

Queue.registry = registry;

class Worker {
  // eslint-disable-next-line no-unused-vars
  constructor(name, processor, opts) {
    this.name = name;
  }
  on() {
    return this;
  }
  async close() {}
}

class QueueEvents {
  constructor() {}
  on() {
    return this;
  }
  async close() {}
}

module.exports = { Queue, Worker, QueueEvents };
