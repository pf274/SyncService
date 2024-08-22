# Sync Service

## ATTENTION: This Package is brand new and may still have bugs. If you notice any, please report them in the github repository.

The Sync Service is a lightweight and reliable package designed to help you keep your clients' data in sync across devices. It simplifies data synchronization between your application and the cloud, ensuring changes are reflected on all connected devices.

Note: This is meant for synchronizing simple JSON data. It won't handle more complex operations like large file uploads. 

## Features

- Real-time Synchronization: The Sync Service ensures that data changes are made locally in real-time, handling cloud synchronization in the background.

- Conflict resolution: The Sync Service returns the most recent versions of resources.

- Cross-platform Compatibility: The Sync Service is designed to work across different platforms, including web, mobile, and desktop applications, making it easy to integrate into any project.

- Offline-Compatible: The Sync Service is meant for offline compatibility, meaning your device should be able to run completely offline, then sync back to the cloud once your connection is restored.

- Operation Efficiency: The Sync Service is capable of consolidating operations in order to save bandwidth and reduce your backend costs.

- Encryption: The Sync Service can be configured to encrypt all your data automatically.

- Resumable: The Sync Service ensures that no operations are lost, and resumes where it left off when booting up.

- User Separation: The Sync Service can handle multiple client-side users without mixing their data.

- State Integration: The Sync Service is capable of updating react state variables.

## Installation

To install the Sync Service npm package, run the following command:

```
npm install node-js-light-sync
```

## Usage

To use the Sync Service in your project, follow these steps:

### Backend Configuration
1. Create a syncDate property: In your user model, add a syncDate property to store the last time the user's data was synced.
2. Update syncDate on data changes: Whenever a user creates, updates, or deletes data, update the syncDate property.
3. Return syncDate in API responses: In your API endpoints that modify user data, include the syncDate property in the response.
```javascript
// Backend API endpoint
app.post('/users/:userId', async (req, res) => {
  // modify data here...
  const user = await User.findById(req.params.userId);
  const newSyncDate = new Date();
  await User.updateSyncDate(newSyncDate);
  res.json({
    ...user.toObject(),
    syncDate: newSyncDate.toISOString(),
  });
});

```

This allows your frontend to know when there are changes that need to be pulled in by comparing a locally-stored sync date to the cloud's sync date.

### Configure commands

Command configuration is a fundamental aspect of using the Sync Service. You must define custom commands that interact with your backend API to handle synchronization tasks.

For each command, extend from one of the base commands provided by this package, such as `CreateCommand`. Implement the abstract methods.

```javascript
export class CommandCreateFolder extends CreateCommand {
  resourceInfo: ISyncResource;
  resourceType: string = "Folder";
  constructor(
    commandRecord: Record<string, any>,
    resourceId?: string,
    updatedAt?: Date
  ) {
    super();
    this.resourceInfo = {
      resourceType: this.resourceType,
      resourceId: resourceId || generateUuid(),
      data: commandRecord,
      updatedAt: updatedAt || new Date(),
    };
  }
  sync = async () => {
    const response = await axios.post('yourendpoint', this.resourceInfo.data, config);
    if (!response.headers.sync_date) {
      throw new Error('Create folder command failed to return a sync date header');
    }
    return {
      newSyncDate: new Date(response.headers.sync_date),
      newResourceInfo: response.data,
    };
  };
}
```

Create, update, and delete commands need a sync method. The sync method should return an object with the key/value pairs `newSyncDate` and `newResourceInfo`.  
`newResourceInfo` is an object containing these key/value pairs:
- `resourceType` - string. In our example above, the resource type was `Folder`.
- `resourceId` - string. The unique resource id.
- `data` - object. The resource's information.
- `updatedAt` - Date. When the resource was last updated.

Read and ReadAll operations need a getCloudCopies method. This returns an array of resources from your server. Each resource is an object with the same key/value pairs as mentioned in `newResourceInfo`.

### Initialization
Before you can start the sync service, you must call SyncService.initialize(). The function takes four parameters:
- `getCloudSyncDate` - should return the user's sync date from your server, or null if the call fails.
- `commandMapper` - should take in the command name, the resource id, and the resource info. It should return either an instance of one of your command classes, or null. The resource info contains the same information as `newResourceInfo` mentioned above.
- `saveToStorage` - This function should accept a `name` parameter specifying what it should name the document in your storage system, along with a `data` parameter specifying what should be saved.
- `loadFromStorage` - This function should accept a `name` parameter specifying what document it should load from your storage system, and should return whatever is stored under that name. If nothing is found, it should return null.
- `initializationCommands` - As an optional fourth parameter, you may specify 'Read All' operations to be executed when the service starts. When starting, the sync service will check the locally stored `Sync Date` value and compare it with the cloud's `Sync Date` value, and if the cloud has a more recent sync date, it will use these commands to get a fresh copy of the data before executing commands.

### Additional Configuration
The Sync Service has several configurable settings. Access these settings under `SyncService.config`.
- `enableEncryption` - takes the encryption key as a parameter. Encryption is disabled by default. Using this command will enable it.
- `disableEncryption` - re-disables encryption.
- `setOnlineChecker` - takes a function as a parameter that should return a boolean value for whether the client is online. A default function is provided.
- `setMaxConcurrentRequests` - specify the number of API calls to run at once. Note that operations for the same resource will always be run sequentially and not concurrently. The default is 3 operations.
- `setMinCommandAgeInSeconds` - specify how long the sync service should wait to execute commands. This can be useful if you want to allow the sync service more time to merge operations before sending them off. For example, if a user creates a resource and edits it soon after, having enough time to merge these two operations before executing them can reduce the number of API calls you are making. The default is 0 seconds.
- `setSecondsBetweenSyncs` - specify how long the service should wait between syncs. The default is 5 seconds.
- `setStoragePrefix` - specify what prefix to use for storage. The default is `sync-service`. This is useful if you want to allow multiple users to save data on the device.
- `setResourceListener` - allows you to specify a listener function that takes in the updated array of a resource type and does whatever you want with it. This is useful if you want to save the array in react state, for example.
- `setDebug` - toggle debug messages. Default is false.

### Start Syncing

Finally, start the sync service!

### Adding commands

Add a new command to the sync queue using `SyncService.addCommand(newCommandInstance)`;

```javascript
const command = new CreateVideoCommand(videoRecord);
SyncService.addCommand(command);
```

### Example
Setup:
```javascript
import { SyncService } from "../src/SyncService";
import * as fs from "fs";
import { CommandDeleteFolder } from "./testOperations/DeleteFolder";
import { CommandCreateFolder } from "./testOperations/CreateFolder";
import { CommandUpdateFolder } from "./testOperations/UpdateFolder";
import { CommandNames } from "../src/CommandNames";
import { CommandReadAllFolders } from "./testOperations/ReadAllFolders";
import { ISyncResource } from "../src/ISyncResource";

const mapToCommand = (
  commandName,
  resourceId,
  resourceInfo
) => {
  switch (commandName) {
    case CommandNames.Delete:
      return new CommandDeleteFolder(resourceId);
    case CommandNames.Create:
      return new CommandCreateFolder(
        resourceInfo!.data,
        resourceId,
        resourceInfo!.updatedAt
      );
    case CommandNames.Update:
      return new CommandUpdateFolder(
        resourceInfo!.data,
        resourceId,
        resourceInfo!.updatedAt
      );
    default:
      throw new Error("Invalid commandName");
  }
};

async function getCloudSyncDate() {
  return new Date();
}

async function saveToStorage(name: string, data: string) {
  if (!fs.existsSync("./test/data")) {
    fs.mkdirSync("./test/data");
  }
  fs.writeFileSync(`./test/data/${name}`, data);
}

async function loadFromStorage(name: string) {
  if (!fs.existsSync(`./test/data/${name}`)) {
    return null;
  }
  return fs.readFileSync(`./test/data/${name}`).toString();
}

SyncService.initialize(
  getCloudSyncDate,
  mapToCommand,
  saveToStorage,
  loadFromStorage,
  [new CommandReadAllFolders(initialFolders)]
);

SyncService.config.setSecondsBetweenSyncs(1);
SyncService.config.setOnlineChecker(async () => true);
SyncService.config.setMaxConcurrentRequests(1);
SyncService.config.setDebug(true);

SyncService.startSync();
```
Usage:
```javascript
// adding a command
const newFolderCommand = new CommandCreateFolder({name: 'Recipes', description: 'All the best soup recipes'});
SyncService.addCommand(newFolderCommand);

// getting a resource
const soupFolderCommand = new CommandReadFolder(folderId);
const soupFolderObj = await SyncService.read(soupFolderCommand);
```
## Contributing

Contributions are welcome! If you have any ideas, suggestions, or bug reports, please open an issue or submit a pull request on the [GitHub repository](https://github.com/pf274/SyncService).

## License

This project is licensed under the ISC License.