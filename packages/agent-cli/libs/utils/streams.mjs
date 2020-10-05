export class AsyncStream {
  constructor() {
    this._head = {
      next: null,
      data: {
        value: undefined,
        done: false,
      },
    };
    this._customers = new Set();
  }
  add(value) {
    this._write(value);
  }
  close() {
    this._write(null, true);
  }
  createCustomer() {
    return new Customer(this, this._head);
  }
  addCustomer(customer) {
    this._customers.add(customer);
  }
  removeCustomer(customer) {
    this._customers.delete(customer);
  }
  async fromStream(stream) {
    for await (const value of stream) {
      this.add(value);
    }
  }

  _write(value, done = false) {
    const node = {
      data: { value, done },
      next: null,
    };
    this._head.next = node;
    this._head = node;
    const customers = [...this._customers];
    const len = customers.length;
    for (let i = 0; i < len; i += 1) {
      customers[i].write(node.data);
    }
  }
  [Symbol.asyncIterator]() {
    return this.createCustomer();
  }
}

class Customer {
  constructor(stream, head) {
    stream.addCustomer(this);
    this.stream = stream;
    this.current = head;
  }
  write(data) {
    if (this._resolve) {
      this._resolve(data);
      delete this._resolve;
    }
  }
  async next() {
    while (true) {
      if (!this.current.next) {
        await this._waitForNext();
      }
      this.current = this.current.next;

      if (this.current.data.done) {
        this._destroy();
      }
      return this.current.data;
    }
  }
  _waitForNext() {
    return new Promise((resolve) => {
      this._resolve = resolve;
    });
  }
  _destroy() {
    this.stream.removeCustomer(this);
  }
}
