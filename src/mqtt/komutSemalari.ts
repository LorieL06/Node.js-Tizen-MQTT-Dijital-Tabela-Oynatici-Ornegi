import { z } from "zod";

const commandBase = z.object({
  correlationId: z.string().min(1),
  timestamp: z.number().int().nonnegative(),
});

export const mqttCommandSchema = z.discriminatedUnion("command", [
  commandBase.extend({ command: z.literal("reload_playlist") }),
  commandBase.extend({ command: z.literal("restart_player") }),
  commandBase.extend({ command: z.literal("play") }),
  commandBase.extend({ command: z.literal("pause") }),
  commandBase.extend({
    command: z.literal("set_volume"),
    volume: z.number().min(0).max(100).optional(),
  }),
  commandBase.extend({ command: z.literal("screenshot") }),
]);

export type MqttCommand = z.infer<typeof mqttCommandSchema>;

export const commandResultSuccessSchema = z.object({
  type: z.literal("command_result"),
  command: z.string(),
  correlationId: z.string(),
  status: z.literal("success"),
  payload: z.record(z.string(), z.any()).optional(),
});

export const commandResultErrorSchema = z.object({
  type: z.literal("command_result"),
  command: z.string(),
  correlationId: z.string(),
  status: z.literal("error"),
  error: z.object({ code: z.string().min(1), message: z.string().min(1) }),
});

export const commandResultSchema = z.union([commandResultSuccessSchema, commandResultErrorSchema]);
export type CommandResult = z.infer<typeof commandResultSchema>;
