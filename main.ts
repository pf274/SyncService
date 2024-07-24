import { CommandCreateVideo } from "./src/commands/video/CommandCreateVideo";
import { CommandGetAllVideos } from "./src/commands/video/CommandGetAllVideos";
import { SyncService } from "./src/SyncService";

async function getSyncDate() {
  return new Date();
}

async function test(): Promise<void> {
  const getAllVideos = new CommandGetAllVideos();
  // TODO: Add a command to get the cloud sync date
  // TODO: Add a command to save to AsyncStorage
  // TODO: Add a command to get from AsyncStorage
  // TODO: Add a command to check if the device is online
  // TODO: Add a command to get the auth token
  // TODO: Pass these functions into SyncService.startSync
  await SyncService.startSync(getSyncDate, [getAllVideos]);
  setTimeout(() => {
    const command1 = new CommandCreateVideo({fileType: 'mp4', title: 'Test', description: `test ${Math.floor(Math.random() * 1000)}`}, 'b185dce5-ee48-4673-b0c4-14f66bb4e064', );
    const command2 = new CommandCreateVideo({fileType: 'mp4', title: 'Test 2', description: `test ${Math.floor(Math.random() * 1000)}`}, 'd2658bf0-403a-4017-a78e-803b3ce38c2e');
    const command3 = new CommandCreateVideo({fileType: 'mp4', title: 'Test 3', description: 'the same'}, "c2ab9223-cc52-47fe-a9ae-39e2057a8b40");
    const command4 = new CommandCreateVideo({fileType: 'mp4', title: 'Test 4', description: `test ${Math.floor(Math.random() * 1000)}`}, "43ce81cc-ddf7-42dd-a7bc-c34f939911be");
    const command5 = new CommandCreateVideo({fileType: 'mp4', title: 'Test 5', description: `test ${Math.floor(Math.random() * 1000)}`}, "6c9dbdf5-c61c-463f-9353-83f4f4590632");
    SyncService.addCommand(command1);
    SyncService.addCommand(command2);
    SyncService.addCommand(command3);
    SyncService.addCommand(command4);
    SyncService.addCommand(command5);
  }, 2101);
}
test();