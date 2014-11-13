# Entry
Entry is a command-line tool that helps if you want to run multiple long-running processes in the same terminal session.

It takes an `entry.json` file containing an array of commands and runs them as sequential and/or parallel processes. It means you don't have to remember to run multiple commands in many terminal sessions when starting you app.

## Installation

```bash
$ npm install -g node-entry
```

## Usage

```bash
$ entry
```

## Configuration

### Arguments

| Name                                | Details |
| ----------------------------------- | ------- |
| &#8209;&#8209;env&nbsp;(_optional_) | The environment file to source, defaults to `./.env`. |
| &#8209;&#8209;config&nbsp;(_optional_) | The config `entry.json` file for your project. The default location is in the projects's root directory, but Entry will recursively search from the current working directory up a project tree for a file named  `entry.json`. |

### An entry task

```json
{
  "handle": "myHandle",
  "spawn": {
    "command": "sleep",
    "args": [ "2" ]
  },
  "waitOn": "anotherHandle",
  "stdinPrefix": "slp"
}
```

* `handle` (_string, required, must be unique_): The identifier available for `waitOn` properties on other entries in the file.
* `command` (_string, required_): The command you want Entry to run.
* `args` (_array, optional_): Arguments passed to the `command`.
* `waitOn` (_string, optional_): Allows sequential execution. `waitOn` takes a `handle` that is already defined within the file and waits for that `handle`'s command to exit before running.
* `stdinPrefix` (_string, optional, must be unique_): Gives the ability to pass information to a particular entry while Entry is running. For example, a `stdinPrefix` of `nd` for `nodemon` can be used to call `nd.rs` to restart node while entry is running.


## Example entry.json files

### Sequential
```json
[
  {
    "handle": "bread",
    "spawn": {
      "command": "echo",
      "args": [ "toasted", "with", "butter" ]
    }
  },
  {
    "handle": "eggs",
    "spawn": {
      "command": "echo",
      "args": [ "scrambled" ]
    },
    "waitOn": "bread"
  },
  {
    "handle": "coffee",
    "spawn": {
      "command": "echo",
      "args": [ "with", "sugar", "and", "cream" ]
    },
    "waitOn": "eggs"
  },
  {
    "handle": "breakfast",
    "spawn": {
      "command": "echo",
      "args": [ "eat" ]
    },
    "waitOn": "eggs"
  }
]
```

### Parallel
```json
[
  {
    "handle": "clean",
    "spawn": {
      "command": "echo",
      "args": [ "sweep", "mop", "dust" ]
    }
  },
  {
    "handle": "dishes",
    "spawn": {
      "command": "echo",
      "args": [ "load dishwasher", "run dishwasher" ]
    }
  },
  {
    "handle": "laundry",
    "spawn": {
      "command": "echo",
      "args": [ "load washing machine", "run washing machine" ]
    }
  }
]
```

### Real Example

This is an actual entryfile for one of our projects:

```json
[
  {
    "handle": "couch",
    "spawn": {
      "command": "couchdb",
      "args": []
    }
  },
  {
    "handle": "redis",
    "spawn": {
      "command": "redis-server",
      "args": []
    }
  },
  {
    "handle": "gulp",
    "spawn": {
      "command": "./node_modules/gulp/bin/gulp.js",
      "args": [ "clean-build" ]
    }
  },
  {
    "handle": "gulpWatch",
    "spawn": {
      "command": "gulp",
      "args": [ "watch" ]
    },
    "waitOn": "gulp"
  },
  {
    "handle": "nodemon",
    "spawn": {
      "command": "nodemon",
      "args": [ "-w", "server", "-e",  "html,json,js", "server/server.js" ]
    },
    "stdinPrefix": "nd",
    "waitOn": "gulp"
  },
  {
    "handle": "nodemon-worker",
    "spawn": {
      "command": "nodemon",
      "args": [ "-w", "server", "worker/worker.js" ]
    },
    "stdinPrefix": "ndw"
  }
]

```
