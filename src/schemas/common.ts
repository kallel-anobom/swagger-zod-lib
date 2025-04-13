import { z } from "zod";
import { zodExtensions } from "../utils/zod-extensions";

export const commonSchemas = {
  uuid: (options?: { description?: string; example?: string }) => {
    return zodExtensions.withExample(z.string().uuid(), {
      description: options?.description || "Unique identifier",
      example: options?.example || "550e8400-e29b-41d4-a716-446655440000",
    });
  },

  email: (options?: { description?: string; example?: string }) => {
    return zodExtensions.withExample(z.string().email(), {
      description: options?.description || "Valid email address",
      example: options?.example || "user@example.com",
    });
  },
};
