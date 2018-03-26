# promise-router

```
yarn add @tgriesser/promise-router
```

Express Router, attaching a `.catch(next)` on any promise-returning routes to ensure unhandled 
exceptions don't hang the process.

Allows for use of async / await in express middleware without worrying

Use:

```
import { promiseRouter } from '@tgriesser/promise-router'
// Alternatively: const { promiseRouter } = require('@tgriesser/promise-router')

const app = express();
const router = promiseRouter();

router.get('/some-route', async (req, res) => {
  const val = await someAsyncFunction()
  res.json(val);
});

app.use(router);
```