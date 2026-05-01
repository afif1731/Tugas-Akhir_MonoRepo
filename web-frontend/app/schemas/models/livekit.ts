import * as v from 'valibot';

export const LiveKitTokenSchema = v.object({
  token: v.string(),
});

export type ILiveKitToken = v.InferOutput<typeof LiveKitTokenSchema>;
