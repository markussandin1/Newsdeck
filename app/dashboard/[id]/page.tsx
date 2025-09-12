import { notFound } from 'next/navigation'
import Dashboard from '@/components/Dashboard'

interface DashboardPageProps {
  params: Promise<{ id: string }>
}

async function getDashboardData(id: string) {
  try {
    const response = await fetch(`http://localhost:3000/api/dashboards/${id}`, {
      cache: 'no-store' // Always fetch fresh data
    })
    
    if (!response.ok) {
      return null
    }
    
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
    return null
  }
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { id } = await params
  const data = await getDashboardData(id)
  
  if (!data || !data.success) {
    notFound()
  }
  
  return (
    <Dashboard 
      dashboard={data.dashboard} 
    />
  )
}

export async function generateMetadata({ params }: DashboardPageProps) {
  const { id } = await params
  const data = await getDashboardData(id)
  
  return {
    title: data?.dashboard?.name ? `${data.dashboard.name} - Breaking News Dashboard` : 'Dashboard - Breaking News',
    description: `Realtid nyhetsdashboard: ${data?.dashboard?.name || 'Unknown Dashboard'}`
  }
}