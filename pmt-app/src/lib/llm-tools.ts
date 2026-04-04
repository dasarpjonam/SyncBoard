export const defineTools = () => {
  // Define tools for Google Gemini REST API.
  return [
    {
      functionDeclarations: [
        {
          name: "create_work_item",
          description: "Create a new work item (task, bug, feature, etc.) in the current workspace.",
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
          description: "Update an existing work item. You must provide the id of the item.",
          parameters: {
            type: "object",
            properties: {
              id: { type: "string", description: "The ID of the work item to update" },
              title: { type: "string" },
              type: { type: "string" },
              status: { type: "string" },
              assignee: { type: "string" },
              content: { type: "string" }
            },
            required: ["id"]
          }
        }
      ]
    }
  ];
};
