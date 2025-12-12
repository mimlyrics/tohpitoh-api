# Healthcare API Documentation

## Base URL
`http://localhost:5000`

## Authentication
All endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer your_jwt_token_here
```

## Available Endpoints


### GET /api/v1/admin/dashboard
**Category:** Admin
**Description:** GET operation


### GET /api/v1/admin/all-users
**Category:** Admin
**Description:** GET operation


### GET /api/v1/admin/statistics
**Category:** Admin
**Description:** GET operation


### GET /api/v1/admin/pending-validations
**Category:** Admin
**Description:** GET operation


### POST /api/v1/admin/validate-professional
**Category:** Admin
**Description:** POST operation


### GET /api/v1/admin/access-requests
**Category:** Admin
**Description:** GET operation


### PUT /api/v1/admin/manage-user
**Category:** Admin
**Description:** PUT operation


### GET /api/v1/users
**Category:** Users
**Description:** GET operation


### GET /api/v1/users/{id}
**Category:** Users
**Description:** GET operation


### PUT /api/v1/users/{id}
**Category:** Users
**Description:** PUT operation


### DELETE /api/v1/users/{id}
**Category:** Users
**Description:** DELETE operation


### GET /api/v1/doctors
**Category:** Doctors
**Description:** GET operation


### GET /api/v1/doctors/{id}
**Category:** Doctors
**Description:** GET operation


### DELETE /api/v1/doctors/{id}
**Category:** Doctors
**Description:** DELETE operation


### PUT /api/v1/doctors/{id}/approve
**Category:** Doctors
**Description:** PUT operation


### PUT /api/v1/doctors/{id}/reject
**Category:** Doctors
**Description:** PUT operation


### GET /api/v1/patients
**Category:** Patients
**Description:** GET operation


### GET /api/v1/patients/{id}
**Category:** Patients
**Description:** GET operation


### PUT /api/v1/patients/{id}
**Category:** Patients
**Description:** PUT operation


### DELETE /api/v1/patients/{id}
**Category:** Patients
**Description:** DELETE operation


### GET /api/v1/laboratories
**Category:** Laboratories
**Description:** GET operation


### GET /api/v1/laboratories/{id}
**Category:** Laboratories
**Description:** GET operation


### DELETE /api/v1/laboratories/{id}
**Category:** Laboratories
**Description:** DELETE operation


### PUT /api/v1/laboratories/{id}/approve
**Category:** Laboratories
**Description:** PUT operation


### PUT /api/v1/laboratories/{id}/reject
**Category:** Laboratories
**Description:** PUT operation


## Testing with curl
```bash
# Example: Get all users
curl -X GET "http://localhost:5000/api/v1/users" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

## Testing with Postman
1. Set base URL to: `http://localhost:5000`
2. Add header: `Authorization: Bearer YOUR_TOKEN`
3. Test endpoints from the list above
