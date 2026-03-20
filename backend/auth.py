from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, jwk
import os
import json
from dotenv import load_dotenv

load_dotenv()

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials

    try:
        jwk_data = {
            "x": os.getenv("SUPABASE_JWT_X"),
            "y": os.getenv("SUPABASE_JWT_Y"),
            "alg": "ES256",
            "crv": "P-256",
            "ext": True,
            "kid": os.getenv("SUPABASE_JWT_KID"),
            "kty": "EC",
            "key_ops": ["verify"]
        }

        public_key = jwk.construct(jwk_data, algorithm="ES256")

        payload = jwt.decode(
            token,
            public_key,
            algorithms=["ES256"],
            audience="authenticated"
        )

        auth_id: str = payload.get("sub")
        email: str = payload.get("email")

        if auth_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return {"auth_id": auth_id, "email": email}

    except JWTError as e:
        print(f"JWTError: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        print(f"Auth error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )