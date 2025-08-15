import { CampaignsManager } from '@/components/api-example/campaigns-manager'

export default function APITestPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">API Test Dashboard</h1>
      
      <div className="space-y-8">
        <section>
          <CampaignsManager />
        </section>

        <section className="border-t pt-8">
          <h2 className="text-2xl font-bold mb-4">API Endpoints</h2>
          <div className="grid gap-4 text-sm font-mono">
            <div className="p-4 bg-gray-100 rounded">
              <h3 className="font-bold mb-2">Campaigns</h3>
              <ul className="space-y-1">
                <li>GET /api/campaigns</li>
                <li>GET /api/campaigns/[id]</li>
                <li>POST /api/campaigns</li>
                <li>PUT /api/campaigns/[id]</li>
                <li>DELETE /api/campaigns/[id]</li>
              </ul>
            </div>
            
            <div className="p-4 bg-gray-100 rounded">
              <h3 className="font-bold mb-2">Projects</h3>
              <ul className="space-y-1">
                <li>GET /api/projects</li>
                <li>GET /api/projects/[id]</li>
                <li>POST /api/projects</li>
                <li>PUT /api/projects/[id]</li>
                <li>DELETE /api/projects/[id]</li>
              </ul>
            </div>

            <div className="p-4 bg-gray-100 rounded">
              <h3 className="font-bold mb-2">Orders</h3>
              <ul className="space-y-1">
                <li>GET /api/orders</li>
                <li>GET /api/orders/[id]</li>
                <li>POST /api/orders</li>
                <li>PUT /api/orders/[id]</li>
                <li>DELETE /api/orders/[id]</li>
              </ul>
            </div>

            <div className="p-4 bg-gray-100 rounded">
              <h3 className="font-bold mb-2">Tool Purchases</h3>
              <ul className="space-y-1">
                <li>GET /api/tool-purchases</li>
                <li>GET /api/tool-purchases/[id]</li>
                <li>POST /api/tool-purchases</li>
                <li>DELETE /api/tool-purchases/[id]</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}