export const defineTools = () => {
  // Define tools for Google Gemini REST API.
  // Return the correct format for Gemini API - functionDeclarations at top level
  return {
    functionDeclarations: [
      {
        name: "create_work_item",
        description: "Create a NEW work item (task, bug, feature, etc.) in the workspace. ONLY use this when the user explicitly asks to CREATE a new item. DO NOT use this for editing or updating existing items.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "The title of the work item" },
            type: { type: "string", description: "The type of the item (e.g. Task, Bug)" },
            status: { type: "string", description: "The status of the item (e.g. To Do, In Progress)" },
            assignee: { type: "string", description: "The person assigned to the item" },
            content: { type: "string", description: "The detailed description in markdown format" }
          },
          required: ["title", "type", "status"]
        }
      },
      {
        name: "update_work_item",
        description: "Update or edit an EXISTING work item. Use this when the user wants to modify, change, update, edit, or reassign an existing item. The user may reference the item by its ID (e.g. ITEM-123 or ending with 123) or by describing it. You must provide the exact ID of the item to update.",
        parameters: {
          type: "object",
          properties: {
            id: { type: "string", description: "The full ID of the work item to update (e.g. ITEM-1234567890-0)" },
            title: { type: "string", description: "New title for the item" },
            type: { type: "string", description: "New type for the item" },
            status: { type: "string", description: "New status for the item" },
            assignee: { type: "string", description: "New assignee for the item" },
            content: { type: "string", description: "New detailed description" }
          },
          required: ["id"]
        }
      }
    ]
  };
};
