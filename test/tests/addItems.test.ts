import { SyncService } from "../../src/SyncService";
import { cleanupSyncService, setupSyncService } from "../syncServiceSetup";
import { CommandCreateFolder } from "../testOperations/CreateFolder";
import { CommandReadAllFolders } from "../testOperations/ReadAllFolders";
import { CommandReadFolder } from "../testOperations/ReadFolder";
import { wait } from "../waiter";

describe("addItems", () => {
  let localId: string;
  before(() => setupSyncService([]));
  it("should add a folder", async () => {
    await wait(1);
    const createCommand = new CommandCreateFolder({
      name: "Folder 1",
      updatedAt: new Date(),
    });
    localId = createCommand.localId;
    SyncService.addCommand(createCommand);
    await wait(1.1);
    const folders = await SyncService.read(
      new CommandReadFolder(localId, {
        name: "Folder 1 Updated",
        updatedAt: new Date(),
      })
    );
    console.log(folders);
  });
  after(cleanupSyncService);
});
