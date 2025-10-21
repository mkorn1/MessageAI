// Message-related types
export {
    CreateMessage, Message, MessageAttachment, MessageStatus, MessageType, UpdateMessage
} from './message';

// User-related types
export {
    Contact,
    ContactStatus, CreateUser,
    UpdateUser,
    UpdateUserPresence, User,
    UserStatus
} from './user';

// Chat-related types
export {
    Chat, ChatInvitation, ChatMember,
    ChatMemberRole, ChatNotificationSettings, ChatType, CreateChat, InvitationStatus, UpdateChat,
    UpdateChatParticipants
} from './chat';

// Error handling types
export {
    AppError, AuthError, ChatError, ErrorCategory, ErrorContext, ErrorHandlerConfig, ErrorResult, ErrorSeverity, ErrorType, FirebaseError, FirebaseErrorCodes, MessageError, NetworkError, PermissionError, Result, SuccessResult, UserError, ValidationError, createError,
    isRetryableError
} from './errors';

// Re-export commonly used types for convenience
export type {
    Chat as IChat,
    ErrorType as IError, Message as IMessage,
    User as IUser
} from './message';

export type {
    User as IUser
} from './user';

export type {
    Chat as IChat
} from './chat';

export type {
    ErrorType as IError
} from './errors';

