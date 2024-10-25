import { useState, useEffect } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line } from 'recharts'
import Papa from 'papaparse'
import { linearRegression } from 'simple-statistics'

export default function Component() {
  const [data, setData] = useState([])
  const [slope, setSlope] = useState(0)
  const [intercept, setIntercept] = useState(0)
  const [r2, setR2] = useState(0)
  const [mse, setMse] = useState(0)
  const [hours, setHours] = useState('')
  const [predictedScore, setPredictedScore] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/score-SbZTjYfqaM6gxQhNsCRUIwGYqm6BBY.csv')
      const reader = response.body.getReader()
      const result = await reader.read()
      const decoder = new TextDecoder('utf-8')
      const csv = decoder.decode(result.value)
      
      Papa.parse(csv, {
        complete: (result) => {
          const parsedData = result.data.slice(1).map(row => ({
            hours: parseFloat(row[0]),
            score: parseFloat(row[1])
          })).filter(row => !isNaN(row.hours) && !isNaN(row.score))
          
          setData(parsedData)
          
          const regression = linearRegression(parsedData.map(d => [d.hours, d.score]))
          setSlope(regression.m)
          setIntercept(regression.b)
          
          const predictedScores = parsedData.map(d => regression.m * d.hours + regression.b)
          const ssTotal = parsedData.reduce((sum, d) => sum + Math.pow(d.score - mean(parsedData.map(d => d.score)), 2), 0)
          const ssResidual = parsedData.reduce((sum, d, i) => sum + Math.pow(d.score - predictedScores[i], 2), 0)
          setR2(1 - (ssResidual / ssTotal))
          setMse(ssResidual / parsedData.length)
        }
      })
    }
    
    fetchData()
  }, [])

  const handlePredict = () => {
    const studyHours = parseFloat(hours)
    if (!isNaN(studyHours)) {
      const prediction = slope * studyHours + intercept
      setPredictedScore(Math.round(prediction * 100) / 100)
    }
  }

  const regressionLine = [
    { hours: Math.min(...data.map(d => d.hours)), score: slope * Math.min(...data.map(d => d.hours)) + intercept },
    { hours: Math.max(...data.map(d => d.hours)), score: slope * Math.max(...data.map(d => d.hours)) + intercept }
  ]

  return (
    <div className="card">
      <div className="card-header">
        <h2>Study Hours Predictor</h2>
        <p>Predict your score based on study hours</p>
      </div>
      <div className="card-content">
        <div className="input-group">
          <input
            type="number"
            placeholder="Enter study hours"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="input"
          />
          <button onClick={handlePredict} className="btn">Predict</button>
        </div>
        {predictedScore !== null && (
          <p className="predicted-score">
            Predicted Score: {predictedScore}
          </p>
        )}
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid />
            <XAxis type="number" dataKey="hours" name="Study Hours" />
            <YAxis type="number" dataKey="score" name="Score" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Student Data" data={data} fill="#8884d8" />
            <Line
              type="monotone"
              dataKey="score"
              data={regressionLine}
              stroke="#ff7300"
              strokeWidth={2}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function mean(numbers) {
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length
}
