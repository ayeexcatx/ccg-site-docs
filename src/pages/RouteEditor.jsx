import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMapEvents } from 'react-leaflet';
import PageHeader from '@/components/ui/PageHeader';
import HowThisWorks from '@/components/ui/HowThisWorks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, Trash2, GripVertical, MapPin } from 'lucide-react';
import { CHECKPOINT_TYPE_LABELS } from '@/lib/constants';
import 'leaflet/dist/leaflet.css';

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

export default function RouteEditor() {
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [routePoints, setRoutePoints] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [routeName, setRouteName] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [addingCheckpoint, setAddingCheckpoint] = useState(false);
  const [newCheckpointType, setNewCheckpointType] = useState('intersection');
  const [newCheckpointLabel, setNewCheckpointLabel] = useState('');
  const queryClient = useQueryClient();

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.CaptureSession.list('-created_date', 100),
  });

  const { data: existingRoutes = [] } = useQuery({
    queryKey: ['routes', selectedSessionId],
    queryFn: () => base44.entities.RoutePath.filter({ capture_session_id: selectedSessionId }),
    enabled: !!selectedSessionId,
  });

  const { data: existingCheckpoints = [] } = useQuery({
    queryKey: ['checkpoints', selectedSessionId],
    queryFn: () => base44.entities.RouteCheckpoint.filter({ capture_session_id: selectedSessionId }),
    enabled: !!selectedSessionId,
  });

  useEffect(() => {
    if (existingRoutes.length > 0) {
      const route = existingRoutes[0];
      setRouteName(route.route_name || '');
      try { setRoutePoints(JSON.parse(route.polyline_json || '[]')); } catch { setRoutePoints([]); }
    } else {
      setRoutePoints([]);
      setRouteName('');
    }
    setCheckpoints(existingCheckpoints.sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0)));
  }, [existingRoutes, existingCheckpoints]);

  const saveRouteMut = useMutation({
    mutationFn: async (data) => {
      const session = sessions.find(s => s.id === selectedSessionId);
      const routeData = {
        project_id: session?.project_id || '',
        street_segment_id: session?.street_segment_id || '',
        capture_session_id: selectedSessionId,
        route_name: routeName || 'Route',
        route_mode: 'drawn_on_map',
        polyline_json: JSON.stringify(routePoints),
        start_latitude: routePoints[0]?.lat,
        start_longitude: routePoints[0]?.lng,
        end_latitude: routePoints[routePoints.length - 1]?.lat,
        end_longitude: routePoints[routePoints.length - 1]?.lng,
        has_checkpoints: checkpoints.length > 0,
      };
      if (existingRoutes.length > 0) {
        return base44.entities.RoutePath.update(existingRoutes[0].id, routeData);
      }
      return base44.entities.RoutePath.create(routeData);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routes'] }),
  });

  const saveCheckpointMut = useMutation({
    mutationFn: (d) => base44.entities.RouteCheckpoint.create(d),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checkpoints'] }),
  });

  const handleMapClick = (latlng) => {
    if (isDrawing) {
      setRoutePoints(prev => [...prev, { lat: latlng.lat, lng: latlng.lng }]);
    }
    if (addingCheckpoint && newCheckpointLabel) {
      const session = sessions.find(s => s.id === selectedSessionId);
      saveCheckpointMut.mutate({
        project_id: session?.project_id || '',
        street_segment_id: session?.street_segment_id || '',
        capture_session_id: selectedSessionId,
        route_path_id: existingRoutes[0]?.id || '',
        checkpoint_type: newCheckpointType,
        checkpoint_label: newCheckpointLabel,
        sequence_order: checkpoints.length,
        map_latitude: latlng.lat,
        map_longitude: latlng.lng,
        is_client_visible: true,
      });
      setNewCheckpointLabel('');
      setAddingCheckpoint(false);
    }
  };

  return (
    <div>
      <PageHeader title="Route Editor" description="Draw route paths on the map and define checkpoints for capture sessions."
        helpText="The route editor is CCG's primary in-house tool for mapping video/photo documentation to physical locations without requiring GPS hardware." />

      <HowThisWorks items={[
        "Select a capture session, then click 'Draw Route' to start placing points on the map.",
        "Click on the map to add waypoints that form the route polyline. Click 'Stop Drawing' when done.",
        "Add checkpoints at intersections, landmarks, curb ramps, and other notable locations along the route.",
        "Checkpoints create searchable markers that can be linked to video timestamps during marker review.",
        "This manual mapping approach is the preferred method for early builds — GPS sync will be added in the future."
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="h-[500px]">
                <MapContainer center={[34.0522, -118.2437]} zoom={14} className="h-full w-full" scrollWheelZoom={true}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                  <MapClickHandler onMapClick={handleMapClick} />
                  {routePoints.length > 1 && <Polyline positions={routePoints} color="#2563eb" weight={4} />}
                  {routePoints.map((p, i) => (
                    <Marker key={`rp-${i}`} position={[p.lat, p.lng]}>
                      <Popup>Route Point {i + 1}</Popup>
                    </Marker>
                  ))}
                  {checkpoints.filter(c => c.map_latitude && c.map_longitude).map((c, i) => (
                    <Marker key={`cp-${i}`} position={[c.map_latitude, c.map_longitude]}>
                      <Popup>{c.checkpoint_label} ({c.checkpoint_type})</Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Session & Route</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedSessionId || 'none'} onValueChange={v => setSelectedSessionId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select session..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select session...</SelectItem>
                  {sessions.map(s => <SelectItem key={s.id} value={s.id}>{s.session_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input value={routeName} onChange={e => setRouteName(e.target.value)} placeholder="Route name..." />
              <div className="flex gap-2">
                <Button size="sm" variant={isDrawing ? 'destructive' : 'default'} onClick={() => setIsDrawing(!isDrawing)} className="flex-1" disabled={!selectedSessionId}>
                  {isDrawing ? 'Stop Drawing' : 'Draw Route'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setRoutePoints([])} disabled={!routePoints.length}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <Button size="sm" className="w-full gap-2" onClick={() => saveRouteMut.mutate()} disabled={!selectedSessionId || routePoints.length < 2}>
                <Save className="w-4 h-4" /> Save Route
              </Button>
              <p className="text-xs text-muted-foreground">{routePoints.length} points drawn</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Checkpoints</CardTitle>
                <Button size="sm" variant="outline" className="gap-1 h-7" onClick={() => setAddingCheckpoint(!addingCheckpoint)} disabled={!selectedSessionId}>
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {addingCheckpoint && (
                <div className="space-y-2 p-2 rounded bg-muted/50 border">
                  <Select value={newCheckpointType} onValueChange={setNewCheckpointType}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(CHECKPOINT_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input value={newCheckpointLabel} onChange={e => setNewCheckpointLabel(e.target.value)} placeholder="Label..." className="h-8 text-xs" />
                  <p className="text-[10px] text-muted-foreground">Click on the map to place this checkpoint.</p>
                </div>
              )}
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {checkpoints.map((c, i) => (
                  <div key={c.id || i} className="flex items-center gap-2 p-2 rounded bg-muted/30 text-xs">
                    <MapPin className="w-3 h-3 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{c.checkpoint_label}</p>
                      <p className="text-muted-foreground">{CHECKPOINT_TYPE_LABELS[c.checkpoint_type] || c.checkpoint_type}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">#{c.sequence_order + 1}</Badge>
                  </div>
                ))}
                {checkpoints.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No checkpoints yet.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}