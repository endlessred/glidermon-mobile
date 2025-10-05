import React, { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';

interface IsometricHousingProps {
  width?: number;
  height?: number;
  characterX?: number;
  characterY?: number;
}

export default function IsometricHousing({
  width = 300,
  height = 200,
  characterX = 4,
  characterY = 4
}: IsometricHousingProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  // For now, create a simple placeholder with visual representation of the apartment
  // This will be replaced with full Three.js rendering once we test basic functionality

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const renderApartmentGrid = () => {
    const tiles = [];

    // Render tiles in proper isometric order (back to front for correct z-ordering)
    for (let y = 7; y >= 0; y--) {
      for (let x = 0; x < 8; x++) {
        const isWall = y === 0 || x === 0; // Only back wall (y=0) and left wall (x=0), no front walls
        const isCharacterPosition = x === characterX && y === characterY;

        // Correct isometric projection - back to working spacing with small adjustments
        const isoX = (x - y) * 20.15; // Slightly less than original 20
        const isoY = (x + y) * 19.3; // Slightly less than original 10

        tiles.push(
          <View
            key={`${x}-${y}`}
            style={{
              position: 'absolute',
              left: isoX + 200, // Center horizontally in larger container
              top: isoY + 60,   // Center vertically in larger container
              width: 28,        // Square base for proper diamond
              height: 28,       // Square base for proper diamond
              backgroundColor: isWall ? '#696969' : '#8B4513',
              borderWidth: 1,
              borderColor: '#333',
              justifyContent: 'center',
              alignItems: 'center',
              // Create diamond shape using CSS transforms
              transform: [{ rotateZ: '45deg' }],
              zIndex: y * 10 + x // Proper z-ordering: back tiles render first
            }}
          >
            {isCharacterPosition && (
              <View style={{
                transform: [{ rotateZ: '-45deg' }] // Counter-rotate the character
              }}>
                <Text style={{ fontSize: 10, color: 'white' }}>🐾</Text>
              </View>
            )}
          </View>
        );
      }
    }
    return tiles;
  };

  return (
    <View style={{
      width,
      height,
      backgroundColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      {!isLoaded ? (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.05)',
          borderRadius: 8
        }}>
          <Text style={{ color: '#666', fontSize: 12 }}>Loading apartment...</Text>
        </View>
      ) : (
        <View style={{
          backgroundColor: 'rgba(0,0,0,0.05)',
          borderRadius: 8,
          padding: 10
        }}>
          <Text style={{
            textAlign: 'center',
            marginBottom: 10,
            fontSize: 10,
            color: '#666'
          }}>
            🏠 Cozy Apartment
          </Text>
          <View style={{
            width: 400,
            height: 250,
            position: 'relative'
          }}>
            {renderApartmentGrid()}
          </View>
        </View>
      )}
    </View>
  );
}