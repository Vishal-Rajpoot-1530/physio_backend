import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: Request,res: Response,next: NextFunction){
    const started=Date.now();
    console.log(`[API] --> ${req.method} ${req.originalUrl}`);
    res.on('finish',()=>console.log(`[API] <-- ${req.method} ${req.originalUrl} [${res.statusCode}] ${Date.now()-started}ms`));
    next();
  }
}
