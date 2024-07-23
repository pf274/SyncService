import { CommandCreateVideo } from "./commands/CommandCreateVideo";
import { SyncResourceTypes } from "./ISyncResource";
import { SyncService } from "./SyncService";
import { generateUuid } from "./uuid";


async function test(): Promise<void> {
  SyncService.startSync();
  setTimeout(() => {
    const command1 = new CommandCreateVideo({localId: 'b185dce5-ee48-4673-b0c4-14f66bb4e064', title: 'Test', description: `test ${Math.floor(Math.random() * 1000)}`});
    const command2 = new CommandCreateVideo({localId: 'd2658bf0-403a-4017-a78e-803b3ce38c2e', title: 'Test 2', description: `test ${Math.floor(Math.random() * 1000)}`});
    const command3 = new CommandCreateVideo({localId: "c2ab9223-cc52-47fe-a9ae-39e2057a8b40", title: 'Test 3', description: 'the same'});
    const command4 = new CommandCreateVideo({localId: "43ce81cc-ddf7-42dd-a7bc-c34f939911be", title: 'Test 4', description: `test ${Math.floor(Math.random() * 1000)}`});
    const command5 = new CommandCreateVideo({localId: "6c9dbdf5-c61c-463f-9353-83f4f4590632", title: 'Test 5', description: `test ${Math.floor(Math.random() * 1000)}`});
    SyncService.addWrite(SyncResourceTypes.Video, 'b185dce5-ee48-4673-b0c4-14f66bb4e064', command1);
    SyncService.addWrite(SyncResourceTypes.Video, 'd2658bf0-403a-4017-a78e-803b3ce38c2e', command2);
    SyncService.addWrite(SyncResourceTypes.Video, 'c2ab9223-cc52-47fe-a9ae-39e2057a8b40', command3);
    SyncService.addWrite(SyncResourceTypes.Video, '43ce81cc-ddf7-42dd-a7bc-c34f939911be', command4);
    SyncService.addWrite(SyncResourceTypes.Video, '6c9dbdf5-c61c-463f-9353-83f4f4590632', command5);
  }, 2101);
}
test();