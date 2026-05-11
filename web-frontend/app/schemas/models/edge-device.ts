import * as v from 'valibot';

export const deviceStatusMap = {
  ACTIVE: 'Active',
  NO_SIGNAL: 'No Signal',
  DISABLED: 'Disabled',
  ERROR: 'Error',
} satisfies Record<string, string>;

export const DeviceStatus = {
  ACTIVE: 'ACTIVE',
  NO_SIGNAL: 'No_SIGNAL',
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

export type IEdgeDeviceStatus = v.InferInput<typeof EdgeDeviceStatusSchema>;
export type IEdgeDeviceState = v.InferInput<typeof EdgeDeviceStateSchema>;
export type IEdgeDevice = v.InferInput<typeof EdgeDeviceSchema>;
