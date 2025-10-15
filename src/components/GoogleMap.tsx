import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Square, Trash2, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { GOOGLE_MAPS_CONFIG } from '@/config/maps';
import { supabase } from '@/integrations/supabase/client';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { ScatterplotLayer } from '@deck.gl/layers';
import { getTreeColorFromRegimes, getRegimeRange } from '@/utils/treeColorGradient';

interface PalmTree {
  id: string;
  lat: number;
  lng: number;
  timestamp: string;
}

const GoogleMap = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const deckOverlayRef = useRef<GoogleMapsOverlay | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const isSelectingParcelRef = useRef(false);
  const cornersRef = useRef<{ lat: number; lng: number }[]>([]);
  const [isSelectingParcel, setIsSelectingParcel] = useState(false);
  const [corners, setCorners] = useState<{ lat: number; lng: number }[]>([]);
  const [palmTrees, setPalmTrees] = useState<PalmTree[]>([]);
  const [selectedTree, setSelectedTree] = useState<PalmTree | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [parcelNumber, setParcelNumber] = useState<string>('');
  const [blockNumber, setBlockNumber] = useState<string>('');
  const [sectorNumber, setSectorNumber] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [loadParcelNumber, setLoadParcelNumber] = useState<string>('');
  const [loadBlockNumber, setLoadBlockNumber] = useState<string>('');
  const [loadSectorNumber, setLoadSectorNumber] = useState<string>('');
  const [loadTreeRow, setLoadTreeRow] = useState<string>('');
  const [loadTreeCol, setLoadTreeCol] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [numberOfRows, setNumberOfRows] = useState<string>('20');
  const [numberOfCols, setNumberOfCols] = useState<string>('20');
  const [treeData, setTreeData] = useState<any>(null);
  const [showAllTrees, setShowAllTrees] = useState(false);
  const [colorLegend, setColorLegend] = useState<{ minValue: number; maxValue: number } | null>(null);

  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initMap();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_CONFIG.apiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      script.onerror = () => {
        toast({
          title: "Map Error",
          description: "Please add your Google Maps API key to use the map",
          variant: "destructive",
        });
      };
      document.head.appendChild(script);
    };

    const initMap = () => {
      if (!mapRef.current) return;

      const map = new google.maps.Map(mapRef.current, {
        center: GOOGLE_MAPS_CONFIG.mapOptions.center,
        zoom: GOOGLE_MAPS_CONFIG.mapOptions.zoom,
        mapTypeId: GOOGLE_MAPS_CONFIG.mapOptions.mapTypeId as google.maps.MapTypeId,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });

      mapInstanceRef.current = map;
      setMapLoaded(true);

      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (isSelectingParcelRef.current && e.latLng) {
          handleMapClick(e.latLng.lat(), e.latLng.lng());
        }
      });
    };

    loadGoogleMaps();
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.setOptions({
      draggableCursor: isSelectingParcel ? 'crosshair' : 'grab',
    });
  }, [isSelectingParcel]);

  const handleMapClick = (lat: number, lng: number) => {
    const newCorners = [...cornersRef.current, { lat, lng }];
    cornersRef.current = newCorners;
    setCorners(newCorners);

    if (newCorners.length < 4) {
      toast({
        title: `Corner ${newCorners.length} Selected`,
        description: `Click ${4 - newCorners.length} more corner(s) to complete the parcel`,
      });
    } else {
      // All 4 corners selected - create the parcel
      createParcelGrid(newCorners);
      cornersRef.current = [];
      setCorners([]);
      isSelectingParcelRef.current = false;
      setIsSelectingParcel(false);
    }
  };

  const createParcelGrid = (selectedCorners: { lat: number; lng: number }[]) => {
    // Draw polygon on map
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
    }

    const polygon = new google.maps.Polygon({
      paths: selectedCorners,
      strokeColor: '#4A7C59',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#4A7C59',
      fillOpacity: 0.1,
      map: mapInstanceRef.current,
    });

    polygonRef.current = polygon;

    // Bilinear interpolation to map grid points from unit square to quadrilateral
    const interpolatePoint = (u: number, v: number) => {
      const [c0, c1, c2, c3] = selectedCorners;
      const lat = 
        (1 - u) * (1 - v) * c0.lat +
        u * (1 - v) * c1.lat +
        u * v * c2.lat +
        (1 - u) * v * c3.lat;
      const lng = 
        (1 - u) * (1 - v) * c0.lng +
        u * (1 - v) * c1.lng +
        u * v * c2.lng +
        (1 - u) * v * c3.lng;
      return { lat, lng };
    };

    // Get grid dimensions from inputs
    console.log('Creating grid with:', { numberOfRows, numberOfCols });
    const rows = parseInt(numberOfRows) || 20;
    const cols = parseInt(numberOfCols) || 20;
    console.log('Parsed dimensions:', { rows, cols });
    
    if (rows <= 0 || cols <= 0) {
      toast({
        title: "Invalid Input",
        description: "Number of rows and columns must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    // Generate trees in grid
    const newTrees: PalmTree[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Map grid point to quadrilateral using bilinear interpolation
        const u = (col + 0.5) / cols;
        const v = (row + 0.5) / rows;
        const { lat: treeLat, lng: treeLng } = interpolatePoint(u, v);
        
        const newTree: PalmTree = {
          id: `${row},${col}`,
          lat: treeLat,
          lng: treeLng,
          timestamp: new Date().toISOString(),
        };
        
        newTrees.push(newTree);

        // Add marker
        if (mapInstanceRef.current) {
          const marker = new google.maps.Marker({
            position: { lat: treeLat, lng: treeLng },
            map: mapInstanceRef.current,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: '#4A7C59',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 1,
            },
            title: newTree.id,
          });

          marker.addListener('click', async () => {
            setSelectedTree(newTree);
            // Try to fetch tree data from parcels_trees_report if we have parcel info
            if (parcelNumber && blockNumber && sectorNumber) {
              const [row, col] = newTree.id.split(',').map(Number);
              try {
                const { data, error } = await supabase
                  .from('parcels_trees_report')
                  .select('*')
                  .eq('sector', parseInt(sectorNumber))
                  .eq('bloc', parseInt(blockNumber))
                  .eq('parcel', parseInt(parcelNumber))
                  .eq('row', row + 1)
                  .eq('col', col + 1)
                  .maybeSingle();
                
                if (!error && data) {
                  setTreeData(data);
                } else {
                  setTreeData(null);
                }
              } catch (error) {
                console.error('Error fetching tree data:', error);
                setTreeData(null);
              }
            } else {
              setTreeData(null);
            }
          });

          markersRef.current.push(marker);
        }
      }
    }

    setPalmTrees(newTrees);

    toast({
      title: "Parcel Created",
      description: `${rows * cols} trees placed in ${rows}x${cols} grid`,
    });
  };

  const startParcelSelection = () => {
    if (palmTrees.length > 0) {
      toast({
        title: "Clear Grid First",
        description: "Clear existing trees before selecting a new parcel",
        variant: "destructive",
      });
      return;
    }
    isSelectingParcelRef.current = true;
    setIsSelectingParcel(true);
    cornersRef.current = [];
    setCorners([]);
    toast({
      title: "Parcel Selection Mode",
      description: "Click 4 corners to define your parcel area",
    });
  };

  const cancelParcelSelection = () => {
    isSelectingParcelRef.current = false;
    setIsSelectingParcel(false);
    cornersRef.current = [];
    setCorners([]);
    toast({
      title: "Selection Cancelled",
      description: "Parcel selection cancelled",
    });
  };

  const loadFromDatabase = async () => {
    if (!loadParcelNumber || !loadBlockNumber || !loadSectorNumber) {
      toast({
        title: "Missing Information",
        description: "Please enter parcel, block, and sector numbers",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Find the parcel
      const { data: parcel, error: parcelError } = await supabase
        .from('parcels')
        .select('id')
        .eq('parcel_number', parseInt(loadParcelNumber))
        .eq('block_number', parseInt(loadBlockNumber))
        .eq('sector_number', parseInt(loadSectorNumber))
        .single();

      if (parcelError || !parcel) {
        toast({
          title: "Parcel Not Found",
          description: "No parcel found with these numbers",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Build query for trees
      let query = supabase
        .from('trees')
        .select('*')
        .eq('parcel_id', parcel.id);

      // Filter by specific tree if provided
      if (loadTreeRow !== '' && loadTreeCol !== '') {
        query = query
          .eq('row_index', parseInt(loadTreeRow))
          .eq('col_index', parseInt(loadTreeCol));
      }

      const { data: trees, error: treesError } = await query;

      if (treesError) throw treesError;

      if (!trees || trees.length === 0) {
        toast({
          title: "No Trees Found",
          description: "No trees found for this parcel",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Clear existing markers and trees
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      if (polygonRef.current) {
        polygonRef.current.setMap(null);
        polygonRef.current = null;
      }

      // Convert database trees to PalmTree format
      const loadedTrees: PalmTree[] = trees.map((tree) => ({
        id: tree.tree_id,
        lat: tree.latitude,
        lng: tree.longitude,
        timestamp: tree.created_at,
      }));

      setPalmTrees(loadedTrees);

      // Add markers for loaded trees
      if (mapInstanceRef.current) {
        loadedTrees.forEach((tree) => {
          const marker = new google.maps.Marker({
            position: { lat: tree.lat, lng: tree.lng },
            map: mapInstanceRef.current,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: '#4A7C59',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 1,
            },
            title: tree.id,
          });

          marker.addListener('click', async () => {
            setSelectedTree(tree);
            // Fetch tree data from parcels_trees_report
            const [row, col] = tree.id.split(',').map(Number);
            try {
              const { data, error } = await supabase
                .from('parcels_trees_report')
                .select('*')
                .eq('sector', parseInt(loadSectorNumber))
                .eq('bloc', parseInt(loadBlockNumber))
                .eq('parcel', parseInt(loadParcelNumber))
                .eq('row', row + 1) // Database uses 1-based indexing
                .eq('col', col + 1)
                .maybeSingle();
              
              if (!error && data) {
                setTreeData(data);
              } else {
                setTreeData(null);
              }
            } catch (error) {
              console.error('Error fetching tree data:', error);
              setTreeData(null);
            }
          });

          markersRef.current.push(marker);
        });

        // Center map on first tree
        if (loadedTrees.length > 0) {
          mapInstanceRef.current.setCenter({
            lat: loadedTrees[0].lat,
            lng: loadedTrees[0].lng,
          });
          mapInstanceRef.current.setZoom(18);
        }
      }

      toast({
        title: "Trees Loaded",
        description: `Loaded ${loadedTrees.length} tree(s) from database`,
      });
    } catch (error) {
      console.error('Error loading from database:', error);
      toast({
        title: "Load Failed",
        description: "Failed to load data from database",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveToDatabase = async () => {
    if (palmTrees.length === 0) {
      toast({
        title: "No Data",
        description: "No palm trees to save",
        variant: "destructive",
      });
      return;
    }

    if (!parcelNumber || !blockNumber || !sectorNumber) {
      toast({
        title: "Missing Information",
        description: "Please enter parcel, block, and sector numbers",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Insert parcel
      const { data: parcel, error: parcelError } = await supabase
        .from('parcels')
        .insert({
          parcel_number: parseInt(parcelNumber),
          block_number: parseInt(blockNumber),
          sector_number: parseInt(sectorNumber),
        })
        .select()
        .single();

      if (parcelError) {
        if (parcelError.code === '23505') {
          toast({
            title: "Parcel Already Exists",
            description: "This parcel/block/sector combination already exists",
            variant: "destructive",
          });
        } else {
          throw parcelError;
        }
        setIsSaving(false);
        return;
      }

      // Insert trees
      const treesData = palmTrees.map((tree) => {
        const [row, col] = tree.id.split(',').map(Number);
        return {
          parcel_id: parcel.id,
          tree_id: tree.id,
          row_index: row,
          col_index: col,
          latitude: tree.lat,
          longitude: tree.lng,
        };
      });

      const { error: treesError } = await supabase
        .from('trees')
        .insert(treesData);

      if (treesError) throw treesError;

      toast({
        title: "Saved Successfully",
        description: `Saved parcel ${parcelNumber}-${blockNumber}-${sectorNumber} with ${palmTrees.length} trees`,
      });

      // Clear form after successful save
      clearAll();
      setParcelNumber('');
      setBlockNumber('');
      setSectorNumber('');
    } catch (error) {
      console.error('Error saving to database:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save data to database",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const exportToCSV = () => {
    if (palmTrees.length === 0) {
      toast({
        title: "No Data",
        description: "No palm trees to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ['ID', 'Latitude', 'Longitude', 'Timestamp'];
    const rows = palmTrees.map((tree) => [
      tree.id,
      tree.lat.toFixed(8),
      tree.lng.toFixed(8),
      tree.timestamp,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `palm-trees-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `Exported ${palmTrees.length} palm trees`,
    });
  };

  const showAllTreesWithColors = async () => {
    setIsLoading(true);
    try {
      // Fetch ALL records by paginating through 1000 at a time
      let allTreeData: any[] = [];
      let start = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('parcels_trees_report')
          .select('*')
          .range(start, start + batchSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allTreeData = [...allTreeData, ...data];
          start += batchSize;
          console.log(`Fetched ${data.length} records, total: ${allTreeData.length}`);
          
          // If we got less than batchSize, we're done
          if (data.length < batchSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      
      console.log('Final tree data count:', allTreeData.length);
      
      if (allTreeData.length === 0) {
        toast({
          title: "No Data",
          description: "No tree data found in parcels_trees_report",
          variant: "destructive",
        });
        return;
      }

      // Clear existing deck.gl overlay if exists
      if (deckOverlayRef.current) {
        deckOverlayRef.current.setMap(null);
        deckOverlayRef.current = null;
      }
      
      // Clear any regular markers
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      
      // Filter out trees without coordinates
      const validTrees = allTreeData.filter(tree => tree.latitude && tree.longitude);
      
      // Calculate color range
      const { minValue, maxValue } = getRegimeRange(validTrees);
      
      // Store color legend info
      setColorLegend({ minValue, maxValue });
      
      // Create deck.gl ScatterplotLayer
      const scatterplotLayer = new ScatterplotLayer({
        id: 'trees-layer',
        data: validTrees,
        getPosition: (d: any) => [d.longitude, d.latitude],
        getRadius: 4, // 4 meters radius (typical palm tree canopy size)
        getFillColor: (d: any) => getTreeColorFromRegimes(d.nombre_de_regimes_24_25, minValue, maxValue),
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 100],
        onClick: (info: any) => {
          if (info.object) {
            const tree = info.object;
            setTreeData(tree);
            setSelectedTree({
              id: `${tree.row - 1},${tree.col - 1}`,
              lat: tree.latitude,
              lng: tree.longitude,
              timestamp: tree.created_at || new Date().toISOString(),
            });
          }
        },
        updateTriggers: {
          getFillColor: [minValue, maxValue],
        },
      });

      // Create and add deck.gl overlay to map
      if (mapInstanceRef.current) {
        const overlay = new GoogleMapsOverlay({
          layers: [scatterplotLayer],
        });
        
        overlay.setMap(mapInstanceRef.current);
        deckOverlayRef.current = overlay;
      }

      setShowAllTrees(true);
      setPalmTrees([]);
      
      toast({
        title: "All Trees Displayed",
        description: `Showing ${validTrees.length} trees with GPU-accelerated rendering`,
      });
    } catch (error) {
      console.error('Error loading all trees:', error);
      toast({
        title: "Load Failed",
        description: error instanceof Error ? error.message : "Failed to load tree data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearAll = () => {
    setPalmTrees([]);
    setSelectedTree(null);
    setTreeData(null);
    setShowAllTrees(false);
    setColorLegend(null);
    
    // Clear deck.gl overlay if exists
    if (deckOverlayRef.current) {
      deckOverlayRef.current.setMap(null);
      deckOverlayRef.current = null;
    }
    
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }
    isSelectingParcelRef.current = false;
    setIsSelectingParcel(false);
    cornersRef.current = [];
    setCorners([]);
    toast({
      title: "Data Cleared",
      description: "All trees removed",
    });
  };

  return (
    <div className="relative w-full h-screen">
      <div ref={mapRef} className="w-full h-full" />

      {/* Control Panel */}
      <Card className="absolute top-16 left-4 p-4 shadow-lg bg-card/95 backdrop-blur-sm max-w-xs max-h-[90vh] overflow-y-auto">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Square className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Parcel Manager</span>
          </div>

          {/* Load Section */}
          {palmTrees.length === 0 && !isSelectingParcel && (
            <div className="space-y-2 border-b pb-3">
              <h3 className="text-sm font-semibold text-foreground">Load Saved Parcel</h3>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="load-parcel" className="text-xs">Parcel Number</Label>
                  <Input
                    id="load-parcel"
                    type="number"
                    value={loadParcelNumber}
                    onChange={(e) => setLoadParcelNumber(e.target.value)}
                    placeholder="Required"
                    className="h-8"
                  />
                </div>
                <div>
                  <Label htmlFor="load-block" className="text-xs">Block Number</Label>
                  <Input
                    id="load-block"
                    type="number"
                    value={loadBlockNumber}
                    onChange={(e) => setLoadBlockNumber(e.target.value)}
                    placeholder="Required"
                    className="h-8"
                  />
                </div>
                <div>
                  <Label htmlFor="load-sector" className="text-xs">Sector Number</Label>
                  <Input
                    id="load-sector"
                    type="number"
                    value={loadSectorNumber}
                    onChange={(e) => setLoadSectorNumber(e.target.value)}
                    placeholder="Required"
                    className="h-8"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="load-row" className="text-xs">Row (i) - Optional</Label>
                    <Input
                      id="load-row"
                      type="number"
                      value={loadTreeRow}
                      onChange={(e) => setLoadTreeRow(e.target.value)}
                      placeholder="0-19"
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="load-col" className="text-xs">Col (j) - Optional</Label>
                    <Input
                      id="load-col"
                      type="number"
                      value={loadTreeCol}
                      onChange={(e) => setLoadTreeCol(e.target.value)}
                      placeholder="0-19"
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
              <Button
                onClick={loadFromDatabase}
                className="w-full"
                size="sm"
                disabled={isLoading || !loadParcelNumber || !loadBlockNumber || !loadSectorNumber}
              >
                {isLoading ? 'Loading...' : 'Load Trees'}
              </Button>
            </div>
          )}

          {!isSelectingParcel && palmTrees.length === 0 && (
            <>
              <div className="text-xs text-muted-foreground text-center">or</div>
              <div className="space-y-2 border-t pt-3">
                <h3 className="text-sm font-semibold text-foreground">Create New Parcel</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="num-rows" className="text-xs">Rows</Label>
                    <Input
                      id="num-rows"
                      type="number"
                      value={numberOfRows}
                      onChange={(e) => setNumberOfRows(e.target.value)}
                      placeholder="20"
                      className="h-8"
                      min="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="num-cols" className="text-xs">Columns</Label>
                    <Input
                      id="num-cols"
                      type="number"
                      value={numberOfCols}
                      onChange={(e) => setNumberOfCols(e.target.value)}
                      placeholder="20"
                      className="h-8"
                      min="1"
                    />
                  </div>
                </div>
                <Button onClick={startParcelSelection} className="w-full" size="sm">
                  <Square className="mr-2 h-4 w-4" />
                  Select New Parcel
                </Button>
              </div>
              <div className="text-xs text-muted-foreground text-center">or</div>
              <Button 
                onClick={showAllTreesWithColors} 
                className="w-full" 
                size="sm" 
                variant="secondary"
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Show All Trees (Color-Coded)'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Displays all trees from database with color gradient based on regimes 24-25
              </p>
            </>
          )}

          {isSelectingParcel && (
            <>
              <div className="text-sm text-muted-foreground">
                Corners selected: {corners.length} / 4
              </div>
              <Button 
                onClick={cancelParcelSelection}
                variant="destructive"
                className="w-full"
                size="sm"
              >
                Cancel Selection
              </Button>
            </>
          )}

          {palmTrees.length > 0 && (
            <>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="parcel" className="text-xs">Parcel Number</Label>
                  <Input
                    id="parcel"
                    type="number"
                    value={parcelNumber}
                    onChange={(e) => setParcelNumber(e.target.value)}
                    placeholder="e.g. 1"
                    className="h-8"
                  />
                </div>
                <div>
                  <Label htmlFor="block" className="text-xs">Block Number</Label>
                  <Input
                    id="block"
                    type="number"
                    value={blockNumber}
                    onChange={(e) => setBlockNumber(e.target.value)}
                    placeholder="e.g. 2"
                    className="h-8"
                  />
                </div>
                <div>
                  <Label htmlFor="sector" className="text-xs">Sector Number</Label>
                  <Input
                    id="sector"
                    type="number"
                    value={sectorNumber}
                    onChange={(e) => setSectorNumber(e.target.value)}
                    placeholder="e.g. 3"
                    className="h-8"
                  />
                </div>
              </div>

              <Button
                onClick={saveToDatabase}
                className="w-full"
                size="sm"
                disabled={isSaving || !parcelNumber || !blockNumber || !sectorNumber}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save to Database'}
              </Button>
            </>
          )}

          <div className="text-sm text-muted-foreground">
            Trees: <span className="font-semibold text-foreground">{palmTrees.length}</span>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={palmTrees.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              onClick={clearAll}
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={palmTrees.length === 0 && !isSelectingParcel}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      </Card>

      {/* Tree Details */}
      {selectedTree && (
        <Card className="absolute top-4 right-4 p-4 shadow-lg bg-card/95 backdrop-blur-sm w-72 max-h-[80vh] overflow-y-auto">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Tree Details</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedTree(null);
                  setTreeData(null);
                }}
              >
                ×
              </Button>
            </div>
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">ID:</span>{' '}
                <span className="font-mono text-foreground">{selectedTree.id}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Latitude:</span>{' '}
                <span className="font-mono text-foreground">{selectedTree.lat.toFixed(8)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Longitude:</span>{' '}
                <span className="font-mono text-foreground">{selectedTree.lng.toFixed(8)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Marked:</span>{' '}
                <span className="text-foreground">
                  {new Date(selectedTree.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
            
            {treeData && (
              <div className="border-t pt-2 mt-2">
                <h4 className="font-semibold text-foreground mb-2">Report Data</h4>
                <div className="space-y-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">Sector/Bloc/Parcel:</span>{' '}
                    <span className="text-foreground">{treeData.sector}-{treeData.bloc}-{treeData.parcel}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Position:</span>{' '}
                    <span className="text-foreground">Row {treeData.row}, Col {treeData.col}</span>
                  </div>
                  {treeData.variete && (
                    <div>
                      <span className="text-muted-foreground">Variété:</span>{' '}
                      <span className="text-foreground">{treeData.variete}</span>
                    </div>
                  )}
                  {treeData.date_de_plantation && (
                    <div>
                      <span className="text-muted-foreground">Date plantation:</span>{' '}
                      <span className="text-foreground">{treeData.date_de_plantation}</span>
                    </div>
                  )}
                  {treeData.superficie_du_bloc && (
                    <div>
                      <span className="text-muted-foreground">Superficie:</span>{' '}
                      <span className="text-foreground">{treeData.superficie_du_bloc}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    <div className="font-semibold text-foreground mb-1">Régimes (All Seasons):</div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      <div className="text-muted-foreground text-xs">21-22:</div>
                      <div className="text-foreground text-xs font-medium">
                        {treeData.nombre_de_regimes_21_22 ?? 'N/A'}
                      </div>
                      <div className="text-muted-foreground text-xs">22-23:</div>
                      <div className="text-foreground text-xs font-medium">
                        {treeData.nombre_de_regimes_22_23 ?? 'N/A'}
                      </div>
                      <div className="text-muted-foreground text-xs">23-24:</div>
                      <div className="text-foreground text-xs font-medium">
                        {treeData.nombre_de_regimes_23_24 ?? 'N/A'}
                      </div>
                      <div className="text-muted-foreground text-xs">24-25:</div>
                      <div className="text-foreground text-xs font-bold">
                        {treeData.nombre_de_regimes_24_25 ?? 'N/A'}
                      </div>
                      <div className="text-muted-foreground text-xs">25-26:</div>
                      <div className="text-foreground text-xs font-medium">
                        {treeData.nombre_de_regimes_25_26 ?? 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Loading State */}
      {!mapLoaded && (
        <Card className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-6 shadow-lg">
          <p className="text-muted-foreground">Loading map...</p>
        </Card>
      )}

      {/* Instructions */}
      {isSelectingParcel && (
        <Card className="absolute bottom-4 left-1/2 transform -translate-x-1/2 p-3 shadow-lg bg-primary/90 backdrop-blur-sm">
          <p className="text-primary-foreground text-sm font-medium">
            {corners.length === 0 && "Click the first corner of your parcel"}
            {corners.length === 1 && "Click the second corner"}
            {corners.length === 2 && "Click the third corner"}
            {corners.length === 3 && "Click the fourth corner to complete"}
          </p>
        </Card>
      )}

      {/* Color Legend */}
      {colorLegend && showAllTrees && (
        <Card className="absolute bottom-20 left-4 p-4 shadow-lg bg-card/95 backdrop-blur-sm">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Regimes 24-25</h3>
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgb(255, 0, 0)' }} />
                  <span className="text-xs text-muted-foreground">{colorLegend.minValue}</span>
                </div>
                <div className="h-12 w-4 rounded" 
                  style={{ 
                    background: 'linear-gradient(to bottom, rgb(255, 0, 0), rgb(255, 128, 0), rgb(255, 255, 0), rgb(128, 255, 0), rgb(0, 255, 0))' 
                  }} 
                />
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgb(0, 255, 0)' }} />
                  <span className="text-xs text-muted-foreground">{colorLegend.maxValue}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground ml-2">
                <div>Low</div>
                <div className="h-8"></div>
                <div>High</div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default GoogleMap;
