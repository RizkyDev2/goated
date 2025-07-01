import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CheckCircle, Layers, AlertCircle, Github, Bot, Upload, Download, Eye, X, Edit3 } from 'lucide-react';
import { classifyIssue, fetchModels, saveClassificationHistory } from "@/api/ai";
import { useAuth } from "@/hooks/useAuth";

export const PredictPage: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [predictions, setPredictions] = useState<any[] | null>(null);
  const [issueNumber, setIssueNumber] = useState<string>("");
  const [issueTitle, setIssueTitle] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [selectedComment, setSelectedComment] = useState<any>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [activeTab, setActiveTab] = useState("system"); // Track active tab

  const { user } = useAuth();
  const token = user?.token || "";

  

  useEffect(() => {
    const fetchAvailableModels = async () => {
      try {
        setError(""); // Clear previous errors
        const modelList = await fetchModels();
        console.log("📦 List model yang di-fetch:", modelList);
        setModels(Array.isArray(modelList) ? modelList : []);

      } catch (error: any) {
        console.error("❌ Gagal mengambil daftar model:", error);
        setError(`Failed to fetch models: ${error.message}`);
        setModels([]); // Set empty array on error
      }
    };

    fetchAvailableModels();
  }, []);

  const handleCustomModelSubmit = async () => {
    if (!customModel || !githubUrl) {
      alert("Mohon isi model dan URL GitHub terlebih dahulu.");
      return;
    }

    setIsProcessing(true);
    setError(""); // Clear previous errors

    try {
      const response = await fetch("https://sturdy-space-enigma-x54x9jrq74wx26jwv-5000.app.github.dev/api/ml/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: customModel,
          github_url: githubUrl,
          is_custom_model: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("✅ Custom model prediction result:", data);
        
        // Format the response similar to the system model response
        const formattedPredictions = Array.isArray(data.result) ? data.result : [];
        setPredictions(formattedPredictions);
        setIssueNumber(formattedPredictions[0]?.issue_number || "unknown");
        setIssueTitle(data.issue_title || "");

        // Save history if user is authenticated
        if (user && formattedPredictions.length > 0) {
          try {
            await saveClassificationHistory(
              {
                model_name: customModel,
                issue_url: githubUrl,
                issue_title: data.issue_title || "",
                issue_number: formattedPredictions[0]?.issue_number || "",
                source_type: "custom",
                result_json: formattedPredictions,
              },
              token
            );
          } catch (historyError) {
            console.warn("⚠️ Failed to save history:", historyError);
          }
        }
      } else {
        setError(data.error || "Terjadi kesalahan saat klasifikasi.");
      }
    } catch (err) {
      console.error("❌ Gagal melakukan request:", err);
      setError("Terjadi error saat menghubungi server.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClassification = async () => {
    if (!selectedModel || !githubUrl) {
      setError("Please select a model and enter a GitHub URL");
      return;
    }
    
    setIsProcessing(true);
    setError(""); // Clear previous errors

    try {
      const predictionResult = await classifyIssue({
        modelName: selectedModel,
        issueUrl: githubUrl,
      });

      console.log("🎯 Prediction result received:", predictionResult);

      // Ensure predictions is always an array or null
      const resultArray = Array.isArray(predictionResult?.result) ? predictionResult.result : [];
      setPredictions(resultArray);
      setIssueNumber(resultArray[0]?.issue_number || "unknown");
      setIssueTitle(predictionResult.issue_title || "");

      // Save history if user is authenticated
      if (user && resultArray.length > 0) {
        try {
          await saveClassificationHistory(
            {
              model_name: selectedModel,
              issue_url: githubUrl,
              issue_title: predictionResult.issue_title || "",
              issue_number: resultArray[0]?.issue_number || "",
              source_type: "huggingface",
              result_json: resultArray,
            },
            token
          );
        } catch (historyError) {
          console.warn("⚠️ Failed to save history:", historyError);
          // Don't throw error here, just log it
        }
      }

    } catch (err: any) {
      console.error("❌ Gagal klasifikasi:", err);
      setError(`Classification failed: ${err.message}`);
      setPredictions([]); // Set empty array on error
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!predictions || !Array.isArray(predictions)) return;
    
    const headers = ["Issue Number", "Author", "Comment", "Prediction", "Confidence"];
    const csvContent = [
      headers.join(","),
      ...predictions.map(p => `"${p.issue_number || ''}","${p.author || ''}","${(p.comment || '').replace(/"/g, '""').replace(/\n/g, ' ')}","${p.prediction || ''}","${((p.confidence || 0) * 100).toFixed(2)}%"`)
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `klasifikasi_issue_${issueNumber || 'result'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCommentClick = (prediction: any) => {
    setSelectedComment(prediction);
    setShowCommentModal(true);
  };

  const handlePredictionChange = (index: number, newPrediction: string) => {
    if (!predictions) return;
    const updatedPredictions = [...predictions];
    updatedPredictions[index] = { ...updatedPredictions[index], prediction: newPrediction };
    setPredictions(updatedPredictions);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
    return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
  };

  // Safe check for models array
  const modelsArray = Array.isArray(models) ? models : [];
  const hasModels = modelsArray.length > 0;
  const hasPredictions = predictions && Array.isArray(predictions) && predictions.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Klasifikasi Feedback</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Ekstrak dan klasifikasi feedback dari GitHub Issues menggunakan AI
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-red-800 dark:text-red-200">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs 
        defaultValue="system" 
        className="w-full"
        onValueChange={(value) => setActiveTab(value)}
      >
        <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800">
          <TabsTrigger value="system" className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>Model Sistem</span>
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center space-x-2">
            <Upload className="w-4 h-4" />
            <span>Model Kustom</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-6 mt-6">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Bot className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Gunakan Model Sistem
                  </span>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Model yang telah dilatih dan dioptimalkan untuk klasifikasi feedback
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Pilih Model AI
                    </label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Pilih model untuk klasifikasi" />
                      </SelectTrigger>
                      <SelectContent>
                        {!hasModels ? (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            {error ? "Failed to load models" : "Loading models..."}
                          </div>
                        ) : (
                          modelsArray
                            .filter((model) => model && model.trim() !== "") // filter model kosong
                            .map((model) => (
                              <SelectItem key={model} value={model}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{model.split('/').pop()}</span>
                                  <span className="text-xs text-gray-500">{model}</span>
                                </div>
                              </SelectItem>
                            ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      URL GitHub Issue
                    </label>
                    <div className="relative">
                      <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        type="url"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/owner/repo/issues/123"
                        className="h-12 pl-11"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Kategori Klasifikasi</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div>
                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">NFR</span>
                        <p className="text-xs text-gray-600 dark:text-gray-400">New Feature Request</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div>
                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">FIR</span>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Feature Improvement Request</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                      <div>
                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">Komen</span>
                        <p className="text-xs text-gray-600 dark:text-gray-400">General Comment</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleClassification}
                disabled={!selectedModel || !githubUrl || isProcessing}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium"
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Memproses Klasifikasi...</span>
                  </div>
                ) : (
                  <>
                    <Layers className="w-5 h-5 mr-2" />
                    Mulai Klasifikasi
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6 mt-6">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Upload className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Gunakan Model Kustom</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gunakan model dari Hugging Face Hub</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Hugging Face Model ID
                </label>
                <Input
                  type="text"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="username/model-name"
                  className="h-12"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  URL GitHub Issue
                </label>
                <div className="relative">
                  <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo/issues/123"
                    className="h-12 pl-11"
                  />
                </div>
              </div>

              <Button 
                onClick={handleCustomModelSubmit}
                disabled={!customModel || !githubUrl || isProcessing}
                className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Memproses Klasifikasi...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Jalankan Klasifikasi
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Main results table - now shows for both tabs */}
      {hasPredictions && (
        <Card className="mt-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-semibold">
              Hasil Klasifikasi untuk Issue #{issueNumber} — {issueTitle}
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                (Model: {activeTab === "system" ? selectedModel : customModel})
              </span>
            </CardTitle>
            <Button onClick={handleDownloadCSV} className="flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Unduh CSV</span>
            </Button>
          </CardHeader>
          <CardContent className="overflow-auto">
            <div className="min-w-full">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800 text-left">
                  <tr>
                    <th className="px-4 py-3 w-20">Issue #</th>
                    <th className="px-4 py-3 w-32">Author</th>
                    <th className="px-4 py-3 w-80">Komentar</th>
                    <th className="px-4 py-3 w-52">Prediksi</th>
                    <th className="px-4 py-3 w-32">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {predictions.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.issue_number || ''}</td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{p.author || ''}</td>
                      <td className="px-4 py-3 w-80">
                        <button
                          onClick={() => handleCommentClick(p)}
                          className="text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-lg transition-colors group w-full"
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate text-gray-700 dark:text-gray-300">
                              {(p.comment || '').length > 60 ? `${p.comment.substring(0, 60)}...` : p.comment || ''}
                            </span>
                            <Eye className="w-4 h-4 text-gray-400 group-hover:text-blue-500 ml-2 flex-shrink-0" />
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3 w-52">
                        <Select 
                          value={p.prediction || ''} 
                          onValueChange={(value) => handlePredictionChange(i, value)}
                        >
                          <SelectTrigger className="w-full h-10">
                            <SelectValue>
                              <div className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full
                                  ${p.prediction === "NFR" ? "bg-green-500" :
                                    p.prediction === "FIR" ? "bg-blue-500" : "bg-gray-500"}`}>
                                </div>
                                <span className="text-sm font-medium">
                                  {p.prediction || 'Select'}
                                </span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NFR">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span>NFR - New Feature Request</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="FIR">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span>FIR - Feature Improvement Request</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="Komen">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                <span>Komen - General Comment</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getConfidenceColor(p.confidence || 0)}`}>
                          {((p.confidence || 0) * 100).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comment Modal */}
      {showCommentModal && selectedComment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Komentar dari {selectedComment.author}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Issue #{selectedComment.issue_number}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCommentModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-3 py-1 rounded-full text-white text-sm font-semibold
                    ${selectedComment.prediction === "NFR" ? "bg-green-500" :
                      selectedComment.prediction === "FIR" ? "bg-blue-500" : "bg-gray-500"}`}>
                    {selectedComment.prediction}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getConfidenceColor(selectedComment.confidence || 0)}`}>
                    {((selectedComment.confidence || 0) * 100).toFixed(1)}% confidence
                  </span>
                </div>
              </div>
              
              <div className="prose dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
                  {selectedComment.comment || 'No comment available'}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end p-6 border-t dark:border-gray-700">
              <Button 
                onClick={() => setShowCommentModal(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {isProcessing && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <div>
                <span className="text-blue-800 dark:text-blue-200 font-medium text-lg">
                  Mengekstrak dan mengklasifikasi feedback...
                </span>
                <p className="text-blue-600 dark:text-blue-300 text-sm mt-1">
                  Proses ini mungkin membutuhkan beberapa menit tergantung jumlah komentar
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};