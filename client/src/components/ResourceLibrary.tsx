import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Play, BookOpen, Video, File } from "lucide-react";

interface Resource {
  id: number;
  title: string;
  type: 'pdf' | 'video' | 'document' | 'faq';
  category: string;
  downloadUrl: string;
  size?: string;
  duration?: string;
  description: string;
}

export function ResourceLibrary() {
  const { data: resources, isLoading } = useQuery<Resource[]>({
    queryKey: ['/api/resources']
  });

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-500" />;
      case 'video':
        return <Video className="w-4 h-4 text-blue-500" />;
      case 'document':
        return <File className="w-4 h-4 text-green-500" />;
      case 'faq':
        return <BookOpen className="w-4 h-4 text-purple-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'bg-red-100 text-red-800';
      case 'video':
        return 'bg-blue-100 text-blue-800';
      case 'document':
        return 'bg-green-100 text-green-800';
      case 'faq':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BookOpen className="w-5 h-5" />
          <span>Resource Library</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Quick Access Icons */}
          <div className="grid grid-cols-4 gap-3">
            <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
              <FileText className="w-6 h-6 text-red-500 mb-1" />
              <span className="text-xs font-medium text-gray-700">PDFs</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
              <Video className="w-6 h-6 text-blue-500 mb-1" />
              <span className="text-xs font-medium text-gray-700">Videos</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
              <File className="w-6 h-6 text-green-500 mb-1" />
              <span className="text-xs font-medium text-gray-700">Docs</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
              <BookOpen className="w-6 h-6 text-purple-500 mb-1" />
              <span className="text-xs font-medium text-gray-700">FAQs</span>
            </div>
          </div>

          {/* Recent Resources */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Popular Resources</h4>
            
            {resources?.slice(0, 5).map((resource) => (
              <div key={resource.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  {getResourceIcon(resource.type)}
                  <div className="flex-1">
                    <h5 className="text-sm font-medium text-gray-900">{resource.title}</h5>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={getTypeColor(resource.type)} variant="secondary">
                        {resource.type.toUpperCase()}
                      </Badge>
                      {resource.size && (
                        <span className="text-xs text-gray-500">{resource.size}</span>
                      )}
                      {resource.duration && (
                        <span className="text-xs text-gray-500">{resource.duration}</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  {resource.type === 'video' ? (
                    <Play className="w-4 h-4" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ))}

            {/* Default resources when none are loaded */}
            {(!resources || resources.length === 0) && !isLoading && (
              <>
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-red-500" />
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">Employee Handbook</h5>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className="bg-red-100 text-red-800" variant="secondary">PDF</Badge>
                        <span className="text-xs text-gray-500">2.4 MB</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Video className="w-4 h-4 text-blue-500" />
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">Safety Training Video</h5>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className="bg-blue-100 text-blue-800" variant="secondary">VIDEO</Badge>
                        <span className="text-xs text-gray-500">15:30</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Play className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <BookOpen className="w-4 h-4 text-purple-500" />
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">Frequently Asked Questions</h5>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className="bg-purple-100 text-purple-800" variant="secondary">FAQ</Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <BookOpen className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </div>

          <Button variant="outline" className="w-full">
            <BookOpen className="w-4 h-4 mr-2" />
            Browse All Resources
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}