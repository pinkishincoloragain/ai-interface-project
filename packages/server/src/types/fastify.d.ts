import { DatabaseService } from '../services/database';
import { AuthService } from '../services/auth';

declare module 'fastify' {
    interface FastifyInstance {
        db: DatabaseService;
        auth: AuthService;
    }
}
