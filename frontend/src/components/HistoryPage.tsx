import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  History, Search, Eye, Download, Calendar, Bot, AlertCircle, X, Edit3, Save, MessageSquare, Trash2
} from 'lucide-react';

const API_BASE = 'https://sturdy-space-enigma-x54x9jrq74wx26jwv-5000.app.github.dev/api';

interface HistoryItem {
  id: number;
  issue_title: string;
  issue_number: string;
  model_name: string;
  timestamp: string;
  results_json: any;
}

export const HistoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModel, setFilterModel] = useState('all');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedComment, setSelectedComment] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editingRows, setEditingRows] = useState<Set<string>>(new Set());
  const [editedPredictions, setEditedPredictions] = useState<{[key: string]: string}>({});
  const [deleting, setDeleting] = useState<number | null>(null);

  const uniqueModels = Array.from(new Set(history.filter(item => item?.model_name).map(item => item.model_name)));

  useEffect(() => { fetchHistory(); }, []);

  const getToken = () => {
    let token = localStorage.getItem('token');
    if (!token) {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try { token = JSON.parse(savedUser).token; } catch (e) {}
      }
    }
    return token;
  };

  const handleTokenExpiration = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setError('Your session has expired. Please login again.');
  };

  const apiCall = async (url: string, options: any = {}) => {
    const token = getToken();
    if (!token) {
      setError('No authentication token found. Please login again.');
      return null;
    }

    try {
      const response = await fetch(`${API_BASE}${url}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...options
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401 && errorData.msg === 'Token has expired') {
          handleTokenExpiration();
          return null;
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiCall('/history');
      if (data) setHistory(data.history || []);
    } catch (error) {
      setError('Failed to load history: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteHistoryItem = async (itemId: number) => {
    if (!confirm('Are you sure you want to delete this history item?')) return;
    
    try {
      setDeleting(itemId);
      await apiCall(`/history/${itemId}`, { method: 'DELETE' });
      setHistory(prev => prev.filter(item => item.id !== itemId));
      if (selectedItem?.item?.id === itemId) {
        setShowDetailModal(false);
        setSelectedItem(null);
      }
    } catch (error) {
      alert('Failed to delete item: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const parseResults = (resultJson: any) => {
    if (!resultJson) return [];
    let parsed = resultJson;
    if (typeof resultJson === 'string') {
      try { parsed = JSON.parse(resultJson); } catch (e) { return []; }
    }
    if (Array.isArray(parsed)) return parsed;
    if (parsed.predictions) return parsed.predictions;
    if (parsed.results) return parsed.results;
    return [];
  };
  
  const openDetailModal = async (item: HistoryItem) => {
    try {
      const detailData = await apiCall(`/history/${item.id}`);
      const predictions = parseResults(detailData?.results_json || item.results_json);
      
      setSelectedItem({
        item: detailData || item,
        predictions: predictions.map((pred: any, index: number) => ({
          id: pred.id || `comment_${index}`,
          author: pred.author || 'Unknown',
          text: pred.comment || pred.text || pred.body || '',
          top_prediction: pred.prediction || pred.top_prediction || pred.label || 'unknown',
          confidence: pred.confidence ? (pred.confidence > 1 ? pred.confidence : pred.confidence * 100) : 0,
        }))
      });
      setShowDetailModal(true);
    } catch (error) {
      // Fallback to local data
      const predictions = parseResults(item.results_json);
      setSelectedItem({
        item,
        predictions: predictions.map((pred: any, index: number) => ({
          id: pred.id || `comment_${index}`,
          author: pred.author || 'Unknown',
          text: pred.comment || pred.text || pred.body || '',
          top_prediction: pred.prediction || pred.top_prediction || pred.label || 'unknown',
          confidence: pred.confidence ? (pred.confidence > 1 ? pred.confidence : pred.confidence * 100) : 0,
        }))
      });
      setShowDetailModal(true);
    }
  };

  const getPredictionColor = (prediction: string) => {
    if (prediction.includes('Feature') || prediction.includes('FIR')) return 'bg-green-100 text-green-800 border-green-200';
    if (prediction.includes('Bug') || prediction.includes('BR')) return 'bg-red-100 text-red-800 border-red-200';
    if (prediction.includes('Comment') || prediction.includes('C')) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 95) return 'text-green-600 font-bold';
    if (confidence >= 80) return 'text-yellow-600 font-semibold';
    return 'text-red-600';
  };

  const saveChanges = async () => {
    if (!selectedItem) return;
    
    try {
      // Update predictions with edited values
      const updatedPredictions = selectedItem.predictions.map((pred: any) => ({
        ...pred, 
        prediction: editedPredictions[pred.id] || pred.top_prediction,
        top_prediction: editedPredictions[pred.id] || pred.top_prediction
      }));
      
      // TODO: Add backend endpoint for updating predictions
      // await apiCall(`/history/${selectedItem.item.id}/update`, {
      //   method: 'PUT',
      //   body: JSON.stringify({ predictions: updatedPredictions })
      // });
      
      // Update local state
      setSelectedItem({ ...selectedItem, predictions: updatedPredictions });
      setHistory(prev => prev.map(item => 
        item.id === selectedItem.item.id 
          ? { ...item, results_json: updatedPredictions }
          : item
      ));
      
      setEditingRows(new Set());
      setEditedPredictions({});
      alert('Changes saved locally! (Database update pending backend implementation)');
    } catch (error) {
      alert('Failed to save changes: ' + error.message);
    }
  };

  const exportToCSV = () => {
    if (!selectedItem) return;
    const csvContent = [
      ['No', 'Author', 'Comment', 'Prediction', 'Confidence'],
      ...selectedItem.predictions.map((pred: any, index: number) => [
        index + 1, pred.author, `"${pred.text.replace(/"/g, '""')}"`, 
        editedPredictions[pred.id] || pred.top_prediction, `${pred.confidence.toFixed(1)}%`
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `results_${selectedItem.item.issue_number}.csv`;
    link.click();
  };

  const filteredHistory = history.filter(item => {
    const matchesSearch = !searchTerm || 
      item.issue_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.issue_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModel = filterModel === 'all' || item.model_name === filterModel;
    return matchesSearch && matchesModel;
  });

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('id-ID', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Classification History</h1>
        <p className="text-gray-600">View and manage your results</p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input placeholder="Search by title or issue number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <select value={filterModel} onChange={(e) => setFilterModel(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
              <option value="all">All Models</option>
              {uniqueModels.map(model => <option key={model} value={model}>{model}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center text-red-800">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {filteredHistory.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{item.issue_title}</h3>
                    <Badge variant="outline" className="text-xs">#{item.issue_number}</Badge>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                    <span className="flex items-center gap-1"><Bot className="w-4 h-4" />{item.model_name}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{formatDate(item.timestamp)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openDetailModal(item)} className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />View Details
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => deleteHistoryItem(item.id)}
                    disabled={deleting === item.id}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {deleting === item.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredHistory.length === 0 && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No History Found</h3>
            <p className="text-gray-600">
              {searchTerm || filterModel !== 'all' ? 'No results match your filters.' : 'You haven\'t run any classifications yet.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Classification Results</h2>
                  <p className="text-gray-600">{selectedItem.item.issue_title}</p>
                </div>
                <div className="flex items-center gap-2">
                  {Object.keys(editedPredictions).length > 0 && (
                    <Button onClick={saveChanges} className="flex items-center gap-2"><Save className="w-4 h-4" />Save</Button>
                  )}
                  <Button variant="outline" onClick={exportToCSV} className="flex items-center gap-2"><Download className="w-4 h-4" />CSV</Button>
                  <Button 
                    variant="outline" 
                    onClick={() => deleteHistoryItem(selectedItem.item.id)}
                    className="flex items-center gap-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />Delete
                  </Button>
                  <Button variant="ghost" onClick={() => setShowDetailModal(false)}><X className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
              {selectedItem.predictions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <th className="border border-gray-200 p-4 text-left font-semibold">No</th>
                        <th className="border border-gray-200 p-4 text-left font-semibold">Author</th>
                        <th className="border border-gray-200 p-4 text-left font-semibold">Comment</th>
                        <th className="border border-gray-200 p-4 text-left font-semibold">Prediction</th>
                        <th className="border border-gray-200 p-4 text-left font-semibold">Confidence</th>
                        <th className="border border-gray-200 p-4 text-left font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItem.predictions.map((pred: any, index: number) => (
                        <tr key={pred.id} className="hover:bg-blue-50 transition-colors">
                          <td className="border border-gray-200 p-4 text-center font-medium">{index + 1}</td>
                          <td className="border border-gray-200 p-4 font-medium text-gray-800">{pred.author}</td>
                          <td className="border border-gray-200 p-4 max-w-md">
                            <div className="cursor-pointer hover:text-blue-600" onClick={() => { setSelectedComment(pred.text); setShowCommentModal(true); }}>
                              <div className="truncate" title="Click to view full comment">{pred.text}</div>
                              <MessageSquare className="w-4 h-4 inline-block ml-2 text-blue-500" />
                            </div>
                          </td>
                          <td className="border border-gray-200 p-4">
                            {editingRows.has(pred.id) ? (
                              <select value={editedPredictions[pred.id] || pred.top_prediction} onChange={(e) => setEditedPredictions(prev => ({ ...prev, [pred.id]: e.target.value }))} className="px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500">
                                <option value="Feature Improvement Request (FIR)">Feature Improvement Request (FIR)</option>
                                <option value="Comment (C)">Comment (C)</option>
                                <option value="Bug Report (BR)">Bug Report (BR)</option>
                              </select>
                            ) : (
                              <Badge className={`text-xs px-3 py-1 ${getPredictionColor(editedPredictions[pred.id] || pred.top_prediction)}`}>
                                {editedPredictions[pred.id] || pred.top_prediction}
                              </Badge>
                            )}
                          </td>
                          <td className="border border-gray-200 p-4">
                            <span className={`font-bold ${getConfidenceColor(pred.confidence)}`}>{pred.confidence.toFixed(1)}%</span>
                          </td>
                          <td className="border border-gray-200 p-4">
                            <Button variant="ghost" size="sm" onClick={() => {
                              const newEditingRows = new Set(editingRows);
                              if (newEditingRows.has(pred.id)) { newEditingRows.delete(pred.id); } else { newEditingRows.add(pred.id); }
                              setEditingRows(newEditingRows);
                            }} className="flex items-center gap-1 hover:bg-blue-100">
                              <Edit3 className="w-3 h-3" />{editingRows.has(pred.id) ? 'Done' : 'Edit'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No classification results available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Full Comment</h2>
                <Button variant="ghost" onClick={() => setShowCommentModal(false)}><X className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="p-6 overflow-auto max-h-[calc(80vh-120px)]">
              <div className="bg-gray-50 p-4 rounded-lg border">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{selectedComment}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};