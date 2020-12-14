// decorators.js
import { createDecorator } from 'vue-class-component'

// Declare Log decorator.
export const Store = createDecorator((options, key) => {
  // Keep the original method for later.
  if (options && options.methods && options.methods[key]) {
    const originalMethod = options.methods[key]

    // Wrap the method with the logging logic.
    options.methods[key] = function wrapperMethod(...args) {
      // Print a log.
      console.log(`Invoked: ${key}(`, ...args, ')')

      // Invoke the original method.
      originalMethod.apply(this, args)
    }
  }
})