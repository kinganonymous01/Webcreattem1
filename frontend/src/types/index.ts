interface FileItem {
  path:    string
  content: string
}

interface FolderStructure {
  folders: string[]
}

interface PlannerFileItem {
  path:        string
  explanation: string
}

interface PlannerResult {
  projectName: string
  structure:   FolderStructure
  files:       PlannerFileItem[]
}

interface FileDescription {
  type:        string
  purpose:     string
  imports:     string[]
  exports:     string[]
  props:       string[]
  connects_to: string[]
  explanation: string
}

interface FileDescriptionItem {
  path:        string
  description: FileDescription
}

interface DepthResult {
  structure: FolderStructure
  files:     FileDescriptionItem[]
}

interface PromptFileItem {
  path:   string
  prompt: string
}

interface PromptGeneratorResult {
  files: PromptFileItem[]
}

interface FileUpdateItem {
  filename:     string
  filepath:     string
  updated_code: string
}

interface FileReadItem {
  filename: string
  filepath: string
}

interface ActionLogItem {
  action: "0" | "1" | "2" | "3"
  data:   string | FileUpdateItem[] | FileReadItem[]
  result: string
}

interface AgentResponse {
  fixed_status: boolean
  action:       "0" | "1" | "2" | "3"
  data:         string | FileUpdateItem[] | FileReadItem[]
}

interface CleanedError {
  command: string
  side:    "frontend" | "backend"
  error:   string
}

interface GenerateOrchestratorInput {
  projectId:    string
  userId:       string
  files:        FileItem[]
  descriptions: FileDescriptionItem[]
  structure:    FolderStructure
}

interface GenerateOrchestratorResult {
  success: boolean
  files:   FileItem[]
  errors:  CleanedError[]
}

interface ModifyOrchestratorInput {
  files:        FileItem[]
  descriptions: FileDescriptionItem[]
  instruction:  string
  projectId:    string
  userId:       string
}

interface ModifyOrchestratorResult {
  success:       boolean
  files:         FileItem[]
  modifiedFiles: FileItem[]
  message:       string
  errors:        CleanedError[]
}

interface WSMessage {
  projectId: string
  type:      "build" | "chat"
  status:    string
}

interface BuildResponse {
  success:     boolean
  projectId:   string
  projectName: string
  structure:   FolderStructure
  files:       FileItem[]
  message?:    string
}

interface ModifyResponse {
  type:    "modification" | "question"
  files:   FileItem[]
  message: string
}

interface ChatSummaryResult {
  type:        "modification" | "question"
  instruction: string
}

interface ProjectListItem {
  projectId:   string
  projectName: string
  createdAt:   Date
}

interface ProjectResponse {
  projectId:   string
  projectName: string
  prompt:      string
  structure:   FolderStructure
  files:       FileItem[]
  chatHistory: ChatMessage[]
}

interface ChatMessage {
  role:      "user" | "assistant"
  message:   string
  timestamp: Date | string
}

interface CommandResult {
  stdout:   string
  stderr:   string
  exitCode: number
}

interface ProcessingLock {
  userId:      string
  operationId: string
}
