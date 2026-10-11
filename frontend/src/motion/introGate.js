class IntroGate {
    constructor() {
        this.registered = false;
        this.completed = false;
        this.callbacks = [];
    }

    register() {
        this.registered = true;
    }

    complete() {
        this.completed = true;
        this.callbacks.forEach(cb => cb());
        this.callbacks = [];
    }

    wait(cb) {
        if (!this.registered || this.completed) {
            cb();
        } else {
            this.callbacks.push(cb);
        }
    }
}

export const introGate = new IntroGate();
