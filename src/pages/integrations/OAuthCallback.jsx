import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import useIntegrationStore from '../../store/integrationStore'

export default function OAuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const finishGoogleOAuth = useIntegrationStore((s) => s.finishGoogleOAuth)
  const [error, setError] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    const err = searchParams.get('error')

    if (err) {
      setError('Google connection was cancelled or denied.')
      return
    }
    if (!code) {
      setError('No authorization code received.')
      return
    }

    finishGoogleOAuth(code)
      .then(() => navigate('/integrations', { replace: true }))
      .catch((e) => setError(e.message || 'Connection failed'))
  }, [searchParams, finishGoogleOAuth, navigate])

  return (
    <div className="min-h-screen bg-jos-bg flex items-center justify-center p-8">
      <div className="w-full max-w-md text-center">
        {error ? (
          <>
            <p className="text-jos-error text-sm mb-4">{error}</p>
            <Link to="/integrations" className="text-jos-accent text-sm hover:underline">
              Back to Integrations
            </Link>
          </>
        ) : (
          <>
            <div className="w-8 h-8 border-2 border-jos-border border-t-jos-accent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-jos-muted text-sm">Connecting Google…</p>
          </>
        )}
      </div>
    </div>
  )
}
