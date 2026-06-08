import * as v from 'valibot';

export const deviceStatusMap = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  NO_SIGNAL: 'No Signal',
  DISABLED: 'Disabled',
  ERROR: 'Error',
} satisfies Record<string, string>;

export const DeviceStatus = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  NO_SIGNAL: 'NO_SIGNAL',
  DISABLED: 'DISABLED',
  ERROR: 'ERROR',
} as const;

export const EdgeDeviceStatusSchema = v.enum(DeviceStatus);

export const EdgeDeviceStateSchema = v.object({
  id: v.string(),
  cpu: v.number(),
  ram: v.number(),
  storage: v.number(),
});

export const EdgeDeviceSchema = v.object({
  id: v.string(),
  name: v.string(),
  location: v.string(),
  status: v.enum(DeviceStatus),
  max_cameras: v.number(),
  _count: v.object({
    cameras: v.number(),
  }),
});

export const DeviceCameraSchema = v.object({
  id: v.string(),
  name: v.string(),
  slug: v.string(),
  status: v.enum(DeviceStatus),
});

export const DeviceDetailSchema = v.object({
  id: v.string(),
  name: v.string(),
  slug: v.string(),
  type: v.string(),
  location: v.string(),
  status: v.enum(DeviceStatus),
  max_cameras: v.number(),
  cameras: v.array(v.object({ ...DeviceCameraSchema.entries })),
});

export const EditDeviceSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.nonEmpty('Device name required')),
  type: v.pipe(v.string(), v.trim(), v.nonEmpty('Device type required')),
  location: v.pipe(v.string(), v.trim(), v.nonEmpty('Device location required')),
  max_cameras: v.pipe(v.string(), v.trim(), v.nonEmpty('Device max cameras required')),
});

export type IDeviceCamera = v.InferInput<typeof DeviceCameraSchema>;
export type IDeviceDetail = v.InferInput<typeof DeviceDetailSchema>;
export type IEdgeDeviceStatus = v.InferInput<typeof EdgeDeviceStatusSchema>;
export type IEdgeDeviceState = v.InferInput<typeof EdgeDeviceStateSchema>;
export type IEdgeDevice = v.InferInput<typeof EdgeDeviceSchema>;
