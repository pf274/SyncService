# Sync Service

# ATTENTION: THIS PACKAGE IS NOT READY FOR PUBLIC USE. We are working out bugs right now.

The Sync Service npm package is a powerful tool for synchronizing data across multiple devices and platforms. It provides a seamless and efficient way to keep data in sync, ensuring that changes made on one device are reflected on all other devices.

## Features

- Real-time synchronization: The Sync Service ensures that data changes are made locally in real-time, handling cloud synchronization in the background.

- Conflict resolution: The sync service prioritizes the most recent versions of resources

- Cross-platform compatibility: The Sync Service is designed to work across different platforms, including web, mobile, and desktop applications, making it easy to integrate into any project.

- Scalability: The Sync Service is built to handle large amounts of data and can scale effortlessly as your application grows. It also allows synchronization operations to be merged together to save bandwidth. For instance, creating and deleting the same resource will cancel out.

- Offline-Compatible: The Sync Service is meant for offline compatibility, meaning your device should be able to run completely offline, then sync back to the cloud once your connection is restored.

## Installation

To install the Sync Service npm package, simply run the following command:

```
npm install node-js-light-sync
```

## Usage

To use the Sync Service in your project, follow these steps:

### Configure backend

Ensure that your backend service keeps track of when your user last made a change that should be synced, and returns that value when it is updated.

For example, say I have a `user` table with a `syncDate` property. When the user creates or edits a file, this value is updated and also returned in the api call.

### Create commands

Create commands to use in your sync service.

For each command, extend from one of the base commands provided by this package, such as `CreateCommand`. Implement the abstract methods.

```javascript
export class CommandCreateVideo extends CreateCommand {
  constructor(commandRecord: Record<string, any>, resourceId?: string) {
    super("Video", CommandNames.Create, resourceId || generateUuid(), commandRecord);
  }
  canMerge(other: ICommand) {
    if (other.resourceId === this.resourceId) {
      if (other.commandName == CommandNames.Update) {
        return true;
      }
    }
    return false;
  }
  canCancelOut(other: ICommand): boolean {
    if (other.resourceId === this.resourceId) {
      if (other.commandName === CommandNames.Delete) {
        return true;
      }
    }
    return false;
  }
  private getFetchConfig() {
    const config = {
      url: "yourAPIEndpoint",
      init: {
        method: 'POST',
        body: JSON.stringify({
          ...this.commandRecord,
          resourceId: this.resourceId,
        }),
        headers: {
          'Authorization': 'Bearer blahBlahBlah'
        }
      }
    }
    return config;
  }
  sync = async() => {
    const config = this.getFetchConfig();
    const response = await fetch(config.url, config.init);
    const body: Record<string, any> = await response.json();
    if (!response.ok) {
      return {newSyncDate: null, newRecord: {}};
    }
    const headers = this.getHeaders(response);
    if (!headers.sync_date) {
      throw new Error('Sync date not found in headers for CommandCreateVideo');
    }
    return {
      newSyncDate: new Date(headers.sync_date),
      newRecord: body
    };
  }
}
```

The sync method should always return an object with the key/value pairs `newSyncDate` and `newRecord`. If the api call fails, return a newSyncDate of `null` and an empty object for `newRecord`.

### Import SyncService

Import the Sync Service module into your code

```javascript
import { SyncService } from "node-js-light-sync";
```

### Configure the Sync Service

The Sync Service has several configurable settings. Access these settings under `SyncService.config`.

- `enableEncryption` - takes the encryption key as a parameter. Encryption is disabled by default. Using this command will enable it.
- `disableEncryption` - re-disables encryption.
- `setOnlineChecker` - takes a function as a parameter that should return a boolean value for whether the client is online. A default function is provided.
- `setLoadFromStorage` - takes a function as a parameter. This function should accept a `name` parameter specifying what it should load from your storage system, and should return whatever is stored under that name. If nothing is found, it should return an empty object.
- `setMaxConcurrentRequests` - specify the number of API calls to run at once. Note that operations for the same resource will always be run sequentially and not concurrently. The default is 3 operations.
- `setMinCommandAgeInSeconds` - specify how long the sync service should wait to execute commands. This can be useful if you want to allow the sync service more time to merge operations before sending them off. For example, if a user creates a resource and edits it soon after, having enough time to merge these two operations before executing them can reduce the number of API calls you are making. The default is 0 seconds.
- `setSaveToStorage` - takes a function as a parameter. This function should accept a `name` parameter specifying what it should name the document in your storage system, along with a `record` parameter specifying what should be saved.
- `setSecondsBetweenSyncs` - specify how long the service should wait between syncs. The default is 5 seconds.
- `setStoragePrefix` - specify what prefix to use for storage. The default is `sync-service`. This is useful if you want to allow multiple users to save data on the device, for example.
- `setResourceListener` - allows you to specify a listener function that takes in the updated array of a resource type and does whatever you want with it. This is useful if you want to save the array in react state, for example.
- `setDebug` - toggle debug messages. Default is false.

### Start Syncing

Before starting your sync service, you'll need to provide two functions:

- `getSyncDate` - should return the user's sync date from your server, or null if the call fails.
- `commandMapper` - should take in the resource type as a string, the command name, and an optional commandRecord. It should return either an instance of one of your command classes, or null.

Example of a commandMapper:

```javascript
function commandMapper(resourceType: string, commandName: CommandNames, commandRecord?: Record<string, any>, resourceId?: string) {
  if (resourceType === 'Video') {
    if (commandName === CommandNames.Create) {
      return new CommandCreateVideo(commandRecord!, resourceId!);
    }
  }
  return null;
}
```

Finally, start the sync service!

```javascript
sync.startSync(getSyncDate, commandMapper);
```

As an optional third parameter to `startSync()`, you may specify 'Read All' operations to be executed when the service boots up. When booting up, the sync service will check the locally stored `Sync Date` value and compare it with the cloud's `Sync Date` value, and if the cloud has a more recent sync date, it will use these commands to get a fresh copy of the data before executing commands.

```javascript
const getAllVideos = new CommandGetAllVideos();
await SyncService.startSync(getSyncDate, commandMapper, [getAllVideos]);
```

### Adding commands

Add a new command to the sync queue using `SyncService.addCommand(newCommandInstance)`;

```javascript
const command = new CreateVideoCommand(videoRecord);
SyncService.addCommand(command);
```

## Contributing

Contributions are welcome! If you have any ideas, suggestions, or bug reports, please open an issue or submit a pull request on the [GitHub repository](https://github.com/pf274/SyncService).

## License

This project is licensed under the ISC License.
