import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// Lazy route modules can take longer than the 1s default on a cold transform.
configure({ asyncUtilTimeout: 5000 })

afterEach(() => {
  cleanup()
})
