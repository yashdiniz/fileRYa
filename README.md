# FileRYa

> Have you ever struggled with duplicate files in your storage devices? Tired of your storage media not performing at even a tenth of the speed that was promised by them?...
Wow, that sounded like an actual marketing promotion for a great new product, and you might not be disappointed with current progress.

FileRYa aims to be a software solution that can efficiently perform various useful but ignored file operations. One of which currently includes:

- Recursively traversing through the parent file directory given, and finding **duplicate** files within it.

While various tools may already do this, which may even find **similar** files, rather than **duplicate** ones, FileRYa aims to perform this task as a JS library, which can be easily imported and used for the purposes you need. Yes, this is not a product intended for the typical audience, but for a programmer audience that can use this well.

Yes this is a JS library, and I may create an interactive shell for it sooner or later.

## The basic list of useful functions

This library is basically imported just like any other nodeJS library.

```js
var FileRYa = require("./FileRYa.js")("/path/to/dir/to/check", {optional:configurations});
```

The FileRYa object can then be used for checking progress, among other things.

## File Walk

## FileData write

## File Stream Queues

> TODO: Complete README
