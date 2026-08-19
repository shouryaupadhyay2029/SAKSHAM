from fastapi import HTTPException, status

class SakshamException(HTTPException):
    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(
            status_code=status_code,
            detail={
                "error": {
                    "code": code,
                    "message": message
                }
            }
        )

class EntityNotFoundException(SakshamException):
    def __init__(self, entity_name: str, entity_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            code="ENTITY_NOT_FOUND",
            message=f"{entity_name} with ID '{entity_id}' was not found."
        )

class InvalidStateTransitionException(SakshamException):
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            code="INVALID_STATE_TRANSITION",
            message=message
        )

class ValidationException(SakshamException):
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="VALIDATION_ERROR",
            message=message
        )
