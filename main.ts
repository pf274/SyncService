import { CommandCreateVideo } from "./src/commands/CommandCreateVideo";
import { SyncResourceTypes } from "./src/interfaces/ISyncResource";
import { CommandNames } from "./src/interfaces/ISyncService";
import { SyncService } from "./src/SyncService";

async function test(): Promise<void> {
  SyncService.startSync();
  setTimeout(() => {
    const commandRecord1 = {localId: 'b185dce5-ee48-4673-b0c4-14f66bb4e064', title: 'Test', description: `test ${Math.floor(Math.random() * 1000)}`};
    const commandRecord2 = {localId: 'd2658bf0-403a-4017-a78e-803b3ce38c2e', title: 'Test 2', description: `test ${Math.floor(Math.random() * 1000)}`};
    const commandRecord3 = {localId: "c2ab9223-cc52-47fe-a9ae-39e2057a8b40", title: 'Test 3', description: 'the same'};
    const commandRecord4 = {localId: "43ce81cc-ddf7-42dd-a7bc-c34f939911be", title: 'Test 4', description: `test ${Math.floor(Math.random() * 1000)}`};
    const commandRecord5 = {localId: "6c9dbdf5-c61c-463f-9353-83f4f4590632", title: 'Test 5', description: `test ${Math.floor(Math.random() * 1000)}`};
    SyncService.addCommand(SyncResourceTypes.Video, CommandNames.Create, 'b185dce5-ee48-4673-b0c4-14f66bb4e064', commandRecord1);
    SyncService.addCommand(SyncResourceTypes.Video, CommandNames.Create, 'd2658bf0-403a-4017-a78e-803b3ce38c2e', commandRecord2);
    SyncService.addCommand(SyncResourceTypes.Video, CommandNames.Create, 'c2ab9223-cc52-47fe-a9ae-39e2057a8b40', commandRecord3);
    SyncService.addCommand(SyncResourceTypes.Video, CommandNames.Create, '43ce81cc-ddf7-42dd-a7bc-c34f939911be', commandRecord4);
    SyncService.addCommand(SyncResourceTypes.Video, CommandNames.Create, '6c9dbdf5-c61c-463f-9353-83f4f4590632', commandRecord5);
  }, 2101);
}
test();