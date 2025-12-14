import json
import boto3
from boto3.dynamodb.conditions import Key
from decimal import Decimal
import csv
import io

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("SkillGapHistory")

def d2(v):
    if isinstance(v, Decimal):
        return float(v)
    return v

def lambda_handler(event, context):
    body = event.get("body")
    if isinstance(body, str):
        body = json.loads(body)

    employee_id = body.get("employeeId")
    if not employee_id:
        return {
            "statusCode": 400,
            "body": "employeeId required"
        }

    res = table.query(
        IndexName="skillGapIndex",
        KeyConditionExpression=Key("employeeId").eq(employee_id)
    )

    items = res.get("Items", [])

    output = io.StringIO()
    writer = csv.writer(output)

    # CSV HEADER
    writer.writerow([
        "EmployeeId",
        "RoleId",
        "MatchPercent",
        "MatchedSkills",
        "MissingSkills",
        "Timestamp",
        "Favorite"
    ])

    for i in items:
        writer.writerow([
            i.get("employeeId"),
            i.get("roleId"),
            d2(i.get("matchPercent", 0)),
            ", ".join(i.get("matchedSkills", [])),
            ", ".join(i.get("missingSkills", [])),
            i.get("timestamp"),
            i.get("favorite", False)
        ])

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "text/csv",
            "Content-Disposition": f'attachment; filename="skill-gap-history-{employee_id}.csv"',
            "Access-Control-Allow-Origin": "*"
        },
        "body": output.getvalue()
    }
