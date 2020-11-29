# dwalt



This project was bootstrapped with [TSPx](https://github.com/joeflateau/tspx).

## Next steps

### `npm run test`

This will run the test suite. Tests are colocated with code and named `*.spec.ts`.

### `npm publish`

This is how you publish to npm. This project has a `prepare` script that compiles the `.ts` to `.js` and `.d.ts`. It also has a `prepublishOnly` script that runs the test suite. Npm will call these scripts automatically as part of the publishing flow so you can be sure you are always publishing the compiled, tested package.

### `npm run prepare` or `npm run build`

You should not need to run these manually, the `prepare`/`prepublishOnly` scripts when you publish should be enough, but if you find it necessary, these are here for you.
