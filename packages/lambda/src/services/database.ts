import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DeleteCommand,
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    QueryCommand,
    UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const hash = (await scryptAsync(password, salt, 32)) as Buffer;
    return `${salt}:${hash.toString('hex')}`;
}

async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const [salt, hash] = hashedPassword.split(':');
    const testHash = (await scryptAsync(password, salt, 32)) as Buffer;
    return hash === testHash.toString('hex');
}

interface User {
    id: string;
    email: string;
    password_hash: string;
    created_at: string;
    updated_at: string;
}

interface PublicUser {
    id: string;
    email: string;
    created_at: string;
    updated_at: string;
}

interface Thread {
    id: string;
    user_id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

interface Message {
    id: string;
    thread_id: string;
    user_id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

export class DatabaseService {
    private client: DynamoDBDocumentClient;
    private usersTable: string;
    private threadsTable: string;
    private messagesTable: string;

    constructor() {
        const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
        this.client = DynamoDBDocumentClient.from(ddbClient);

        this.usersTable = process.env.USERS_TABLE || '';
        this.threadsTable = process.env.THREADS_TABLE || '';
        this.messagesTable = process.env.MESSAGES_TABLE || '';
    }

    async createUser(email: string, password: string): Promise<PublicUser> {
        const passwordHash = await hashPassword(password);
        const now = new Date().toISOString();

        const user: User = {
            id: uuidv4(),
            email,
            password_hash: passwordHash,
            created_at: now,
            updated_at: now,
        };

        const command = new PutCommand({
            TableName: this.usersTable,
            Item: user,
            ConditionExpression: 'attribute_not_exists(email)',
        });

        try {
            await this.client.send(command);
            return this.toPublicUser(user);
        } catch (error: any) {
            if (error.name === 'ConditionalCheckFailedException') {
                throw new Error('User with this email already exists');
            }
            throw error;
        }
    }

    async getUserByEmail(email: string): Promise<User | null> {
        const command = new QueryCommand({
            TableName: this.usersTable,
            IndexName: 'email-index',
            KeyConditionExpression: 'email = :email',
            ExpressionAttributeValues: {
                ':email': email,
            },
        });

        const response = await this.client.send(command);
        return (response.Items?.[0] as User) || null;
    }

    async getUserById(id: string): Promise<PublicUser | null> {
        const command = new GetCommand({
            TableName: this.usersTable,
            Key: { id },
        });

        const response = await this.client.send(command);
        return response.Item ? this.toPublicUser(response.Item as User) : null;
    }

    async verifyPasswordByEmail(email: string, password: string): Promise<PublicUser | null> {
        const user = await this.getUserByEmail(email);
        if (!user) return null;

        const isValid = await verifyPassword(password, user.password_hash);
        return isValid ? this.toPublicUser(user) : null;
    }

    async createThread(userId: string, title: string): Promise<Thread> {
        const now = new Date().toISOString();

        const thread: Thread = {
            id: uuidv4(),
            user_id: userId,
            title,
            created_at: now,
            updated_at: now,
        };

        const command = new PutCommand({
            TableName: this.threadsTable,
            Item: thread,
        });

        await this.client.send(command);
        return thread;
    }

    async getUserThreads(userId: string): Promise<Thread[]> {
        const command = new QueryCommand({
            TableName: this.threadsTable,
            IndexName: 'user-threads-index',
            KeyConditionExpression: 'user_id = :userId',
            ExpressionAttributeValues: {
                ':userId': userId,
            },
            ScanIndexForward: false, // Latest first
        });

        const response = await this.client.send(command);
        return (response.Items as Thread[]) || [];
    }

    async getThread(threadId: string, userId: string): Promise<Thread | null> {
        const command = new GetCommand({
            TableName: this.threadsTable,
            Key: {
                id: threadId,
                user_id: userId,
            },
        });

        const response = await this.client.send(command);
        return (response.Item as Thread) || null;
    }

    async updateThread(
        threadId: string,
        userId: string,
        updates: Partial<Pick<Thread, 'title'>>
    ): Promise<Thread | null> {
        const now = new Date().toISOString();

        const updateExpressions: string[] = [];
        const expressionAttributeNames: Record<string, string> = {};
        const expressionAttributeValues: Record<string, any> = {
            ':updated_at': now,
        };

        if (updates.title) {
            updateExpressions.push('#title = :title');
            expressionAttributeNames['#title'] = 'title';
            expressionAttributeValues[':title'] = updates.title;
        }

        updateExpressions.push('updated_at = :updated_at');

        const command = new UpdateCommand({
            TableName: this.threadsTable,
            Key: {
                id: threadId,
                user_id: userId,
            },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames:
                Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
            ExpressionAttributeValues: expressionAttributeValues,
            ConditionExpression: 'attribute_exists(id)',
            ReturnValues: 'ALL_NEW',
        });

        try {
            const response = await this.client.send(command);
            return response.Attributes as Thread;
        } catch (error: any) {
            if (error.name === 'ConditionalCheckFailedException') {
                return null;
            }
            throw error;
        }
    }

    async deleteThread(threadId: string, userId: string): Promise<boolean> {
        // First delete all messages in the thread
        await this.deleteThreadMessages(threadId);

        // Then delete the thread
        const command = new DeleteCommand({
            TableName: this.threadsTable,
            Key: {
                id: threadId,
                user_id: userId,
            },
            ConditionExpression: 'attribute_exists(id)',
        });

        try {
            await this.client.send(command);
            return true;
        } catch (error: any) {
            if (error.name === 'ConditionalCheckFailedException') {
                return false;
            }
            throw error;
        }
    }

    async createMessage(
        threadId: string,
        userId: string,
        role: 'user' | 'assistant',
        content: string
    ): Promise<Message> {
        const now = new Date().toISOString();

        const message: Message = {
            id: uuidv4(),
            thread_id: threadId,
            user_id: userId,
            role,
            content,
            created_at: now,
        };

        const command = new PutCommand({
            TableName: this.messagesTable,
            Item: message,
        });

        await this.client.send(command);
        return message;
    }

    async upsertMessage(
        messageId: string,
        threadId: string,
        userId: string,
        role: 'user' | 'assistant',
        content: string
    ): Promise<Message> {
        const now = new Date().toISOString();

        const message: Message = {
            id: messageId,
            thread_id: threadId,
            user_id: userId,
            role,
            content,
            created_at: now,
        };

        // Try to update first, then create if doesn't exist
        const updateCommand = new UpdateCommand({
            TableName: this.messagesTable,
            Key: {
                thread_id: threadId,
                created_at: now,
            },
            UpdateExpression: 'SET #content = :content, #id = :id, user_id = :userId, #role = :role',
            ExpressionAttributeNames: {
                '#content': 'content',
                '#id': 'id',
                '#role': 'role',
            },
            ExpressionAttributeValues: {
                ':content': content,
                ':id': messageId,
                ':userId': userId,
                ':role': role,
            },
            ReturnValues: 'ALL_NEW',
        });

        try {
            const response = await this.client.send(updateCommand);
            return response.Attributes as Message;
        } catch {
            // If update fails, create new message
            const putCommand = new PutCommand({
                TableName: this.messagesTable,
                Item: message,
            });

            await this.client.send(putCommand);
            return message;
        }
    }

    async getThreadMessages(threadId: string, userId: string): Promise<Message[]> {
        const command = new QueryCommand({
            TableName: this.messagesTable,
            KeyConditionExpression: 'thread_id = :threadId',
            FilterExpression: 'user_id = :userId',
            ExpressionAttributeValues: {
                ':threadId': threadId,
                ':userId': userId,
            },
            ScanIndexForward: true, // Chronological order
        });

        const response = await this.client.send(command);
        return (response.Items as Message[]) || [];
    }

    private async deleteThreadMessages(threadId: string): Promise<void> {
        const command = new QueryCommand({
            TableName: this.messagesTable,
            KeyConditionExpression: 'thread_id = :threadId',
            ExpressionAttributeValues: {
                ':threadId': threadId,
            },
        });

        const response = await this.client.send(command);
        const messages = response.Items || [];

        // Delete messages in batches
        for (const message of messages) {
            const deleteCommand = new DeleteCommand({
                TableName: this.messagesTable,
                Key: {
                    thread_id: message.thread_id,
                    created_at: message.created_at,
                },
            });
            await this.client.send(deleteCommand);
        }
    }

    private toPublicUser(user: User): PublicUser {
        return {
            id: user.id,
            email: user.email,
            created_at: user.created_at,
            updated_at: user.updated_at,
        };
    }
}
