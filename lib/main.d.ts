import { Group, Loader, LoadingManager } from "three";

export class GDMLLoader extends Loader {
  constructor(manager?: LoadingManager);

  load(
    url: string,
    onLoad: (scene: Group) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (event: ErrorEvent) => void
  ): void;
  //   loadAsync(
  //     url: string,
  //     onProgress?: (event: ProgressEvent) => void
  //   ): Promise<Group>;
  parse(data: string, path: string): Group;
}
