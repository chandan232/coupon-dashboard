# Order Status Dashboard - Stakeholder Guide

## Overview

The Order Status Dashboard provides real-time, interactive visualization of order distribution by status for stakeholder reporting and business analytics.

## Features

### 📊 Interactive Visualizations
- **Bar Chart**: Order count comparison across all statuses
- **Pie Chart**: Percentage distribution of orders by status
- **Status Table**: Detailed breakdown with visual progress indicators

### 📈 Key Metrics
- **Total Orders**: Complete order count
- **Unique Statuses**: Number of distinct order statuses
- **Success Rate**: Percentage of delivered/completed orders
- **Failure Rate**: Percentage of failed/rejected orders

### 🔍 Filtering
- Filter orders by date range (start and end dates)
- Real-time data refresh
- Reset to default view with one click

## Accessing the Dashboard

### Web Interface
Navigate to: `http://your-domain/order-status-dashboard`

### REST API
Get raw JSON data for custom integrations:
```
GET /api/order-status-summary?startDate=2024-01-01&endDate=2024-12-31
```

#### Response Format
```json
{
  "data": [
    {
      "status": "DELIVERED",
      "count": 5432,
      "percentage": 45.2
    },
    {
      "status": "PENDING",
      "count": 2156,
      "percentage": 18.1
    },
    ...
  ],
  "total": 11950,
  "timestamp": "2024-05-04T10:30:00.000Z"
}
```

## MCP (Model Context Protocol) Integration

The dashboard is fully MCP-accessible for AI agents and automation systems.

### Available MCP Tools

#### 1. `get_order_status_summary`
Get order counts grouped by status.

**Parameters:**
- `start_date` (optional): Date in YYYY-MM-DD format
- `end_date` (optional): Date in YYYY-MM-DD format

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "status": "DELIVERED",
      "count": 5432,
      "percentage": 45.2
    },
    {
      "status": "PENDING",
      "count": 2156,
      "percentage": 18.1
    }
  ],
  "timestamp": "2024-05-04T10:30:00.000Z"
}
```

#### 2. `get_order_metrics`
Get key metrics including success rates and failure rates.

**Parameters:**
- `start_date` (optional): Date in YYYY-MM-DD format
- `end_date` (optional): Date in YYYY-MM-DD format

**Example Response:**
```json
{
  "success": true,
  "data": {
    "total_orders": 11950,
    "successful_orders": 5432,
    "failed_orders": 234,
    "success_rate": "45.45",
    "failure_rate": "1.96",
    "unique_statuses": 6,
    "statuses": [
      {
        "status": "DELIVERED",
        "count": 5432,
        "percentage": 45.2
      },
      ...
    ]
  },
  "timestamp": "2024-05-04T10:30:00.000Z"
}
```

## Using MCP Tools with Claude

### Query Order Status Summary
```
Query the order status dashboard to get the current distribution of orders by status.
Use the get_order_status_summary tool with date range 2024-01-01 to 2024-12-31.
```

### Get Business Metrics
```
Get the current order metrics including success rate and failure rate.
Use the get_order_metrics tool for the last 30 days.
```

### Integration Examples

#### Python
```python
import requests

# Get order status summary
response = requests.get('http://localhost:3000/api/order-status-summary')
data = response.json()

for status in data['data']:
    print(f"{status['status']}: {status['count']} ({status['percentage']}%)")
```

#### JavaScript/Node.js
```javascript
fetch('/api/order-status-summary')
  .then(res => res.json())
  .then(data => {
    console.log('Total Orders:', data.total);
    data.data.forEach(status => {
      console.log(`${status.status}: ${status.count} orders`);
    });
  });
```

#### cURL
```bash
curl "http://localhost:3000/api/order-status-summary?startDate=2024-01-01&endDate=2024-12-31"
```

## Status Types

| Status | Color | Description |
|--------|-------|-------------|
| DELIVERED | Blue | Successfully delivered |
| COMPLETED | Cyan | Order completed |
| PENDING | Amber | Awaiting processing |
| PROCESSING | Purple | Currently being processed |
| CONFIRMED | Green | Order confirmed |
| FAILED | Red | Order processing failed |
| REJECTED | Dark Red | Order rejected |
| CANCELLED | Gray | Order cancelled |

## Data Filtering

The dashboard automatically filters out:
- Test orders (`isTest = FALSE`)
- False orders (`isFalseOrder = FALSE`)

## Performance Tips

1. **Date Range Filtering**: Use specific date ranges for faster queries
2. **Stakeholder Reports**: Use the API endpoint for automated report generation
3. **Caching**: API responses can be cached for 5-10 minutes in most cases
4. **Bulk Exports**: Use the REST API for data export to Excel/CSV

## Troubleshooting

### No Data Displayed
- Check date range filters
- Verify database connection
- Ensure orders exist in the specified date range

### API Returns Error
- Check `start_date` and `end_date` formats (YYYY-MM-DD)
- Verify network connectivity
- Check server logs

### MCP Connection Issues
- Ensure MCP server is running: `npm run mcp:start`
- Check environment variables (DATABASE_URL)
- Verify database credentials

## Starting the MCP Server

```bash
# Install dependencies
npm install

# Start the MCP server
npm run mcp:start
```

## Environment Setup

Add to `.env.local`:
```
DATABASE_URL=postgresql://user:password@host:port/database
DATABASE_SSL=true  # or false if not using SSL
```

## API Rate Limiting

- No rate limiting for local development
- Production: Implement rate limiting as needed (e.g., 100 requests/hour per IP)

## Support

For questions or issues:
1. Check the dashboard logs
2. Review API response for error messages
3. Verify database connection and permissions
4. Contact the development team

## Version History

### v1.0.0 (2024-05-04)
- Initial release
- Order status summary API
- Interactive dashboard with multiple visualizations
- MCP tool integration
- Date range filtering
