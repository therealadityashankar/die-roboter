export interface DefaultPivotValues {
  [key: string]: number;
}

export interface CreateJointSlidersOptions {
  containerId?: string;
  defaultValues?: DefaultPivotValues;
}

export interface TabsResult {
  positionPanel: HTMLDivElement;
  jointPanel: HTMLDivElement;
}
